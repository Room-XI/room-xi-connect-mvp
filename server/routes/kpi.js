import express from 'express';
import { pool } from '../db.js';
import { db } from '../db.js';
import { dpApplications } from '../schema.js';
import { addLaplaceNoise, applyDPToStats, applyDifferentialPrivacy } from '../lib/differentialPrivacy.js';
import { addNoiseWithLogging, applyDPWithLogging } from '../middleware/differentialPrivacy.js';
import { Parser } from 'json2csv';

// Helper to log DP application
async function logDPToDatabase(operation, tableName, originalCount, noiseAdded, suppressed, suppressionReason = null) {
  try {
    await db.insert(dpApplications).values({
      operation,
      tableName: tableName || null,
      queryType: 'aggregate',
      originalCount: originalCount || null,
      noiseAdded,
      epsilon: '0.50',
      mechanism: 'laplace',
      suppressed,
      suppressionReason: suppressionReason || null,
      metadata: {
        timestamp: new Date().toISOString(),
        source: 'kpi_endpoint'
      }
    });
  } catch (error) {
    console.error('[KPI DP Logging] Failed to log DP application:', error);
  }
}

const router = express.Router();

// Helper to check if user has permission to view KPIs
async function checkKPIPermission(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check if user is staff/admin
    const result = await pool.query(
      'SELECT role FROM profiles WHERE user_id = $1',
      [req.session.userId]
    );

    if (!result.rows[0] || !['staff', 'admin', 'org_admin'].includes(result.rows[0].role)) {
      return res.status(403).json({ error: 'Forbidden. KPI Dashboard requires staff access.' });
    }

    // Log dashboard access
    await pool.query(
      'INSERT INTO audit_log (actor_id, action, resource_type, timestamp) VALUES ($1, $2, $3, NOW())',
      [req.session.userId, 'dashboard_view', 'kpi_dashboard']
    );

    next();
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Get date range filter from query params
function getDateFilter(req) {
  const range = req.query.range || '30';
  const days = parseInt(range, 10);
  if (![7, 30, 90].includes(days)) {
    return 30; // Default to 30 days
  }
  return days;
}

// GET /api/kpi/daily-checkins - Daily check-in metrics
router.get('/daily-checkins', checkKPIPermission, async (req, res) => {
  try {
    const days = getDateFilter(req);
    
    const query = `
      SELECT * FROM kpi_daily_checkin_rate 
      WHERE day >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY day DESC
    `;
    
    const result = await pool.query(query);
    
    // Apply differential privacy to each row with logging
    const noisyData = await Promise.all(result.rows.map(async (row) => {
      if (row.privacy_status === 'suppressed') {
        await logDPToDatabase('kpi_daily_checkins', 'checkins', row.dau || 0, false, true, 'Below threshold N<7');
        return { ...row, dau: null, total_checkins: null, checkins_per_user: null };
      }
      
      const noisyDau = addLaplaceNoise(row.dau, 1, 0.5);
      const noisyCheckins = addLaplaceNoise(row.total_checkins, 1, 0.5);
      
      // Log DP application
      await logDPToDatabase('kpi_daily_checkins', 'checkins', row.dau, noisyDau.noiseAdded, false);
      
      return {
        ...row,
        dau: noisyDau.value,
        total_checkins: noisyCheckins.value,
        checkins_per_user: noisyDau.value > 0 ? (noisyCheckins.value / noisyDau.value).toFixed(2) : 0,
        dp_applied: true,
        nCount: row.dau
      };
    }));
    
    res.json({
      data: noisyData,
      range: days,
      generated_at: new Date().toISOString(),
      metadata: {
        dpApplied: true,
        epsilon: 0.5,
        minThreshold: 7
      }
    });
  } catch (error) {
    console.error('Error fetching daily check-ins:', error);
    res.status(500).json({ error: 'Failed to fetch daily check-in metrics' });
  }
});

// GET /api/kpi/streak-completion - 7-day streak metrics
router.get('/streak-completion', checkKPIPermission, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM kpi_streak_completion');
    
    if (result.rows.length === 0) {
      return res.json({ data: null, message: 'No streak data available' });
    }
    
    const row = result.rows[0];
    
    if (row.privacy_status === 'suppressed') {
      return res.json({
        data: {
          suppressed: true,
          message: 'Insufficient data for privacy-preserving display'
        }
      });
    }
    
    // Apply differential privacy with logging
    const noisyData = await applyDPWithLogging({
      total_active_users: row.total_active_users,
      users_with_streak: row.users_with_streak,
      streak_completion_percent: row.streak_completion_percent
    }, row.total_active_users, 'kpi_streak_completion', 'profiles');
    
    // Check if suppressed
    if (noisyData.suppressed) {
      return res.json({
        data: {
          suppressed: true,
          message: noisyData.reason || 'Insufficient data for privacy-preserving display'
        },
        metadata: {
          minThreshold: 7
        }
      });
    }
    
    res.json({
      data: noisyData,
      generated_at: new Date().toISOString(),
      metadata: {
        dpApplied: noisyData.noiseAdded,
        epsilon: 0.5,
        nCount: noisyData.nCount
      }
    });
  } catch (error) {
    console.error('Error fetching streak completion:', error);
    res.status(500).json({ error: 'Failed to fetch streak completion metrics' });
  }
});

// GET /api/kpi/explore-unlocks - Explore unlock compliance
router.get('/explore-unlocks', checkKPIPermission, async (req, res) => {
  try {
    const days = getDateFilter(req);
    
    const query = `
      SELECT * FROM kpi_explore_unlock 
      WHERE checkin_date >= CURRENT_DATE - INTERVAL '${days} days'
      ORDER BY checkin_date DESC
    `;
    
    const result = await pool.query(query);
    
    const noisyData = result.rows.map(row => {
      if (row.privacy_status === 'suppressed') {
        return { ...row, total_users: null, users_unlocked: null, unlock_compliance_percent: null };
      }
      
      const noisyTotal = addLaplaceNoise(row.total_users, 1, 0.5);
      const noisyUnlocked = addLaplaceNoise(row.users_unlocked, 1, 0.5);
      
      return {
        ...row,
        total_users: noisyTotal.value,
        users_unlocked: noisyUnlocked.value,
        unlock_compliance_percent: noisyTotal.value > 0 ? 
          ((noisyUnlocked.value / noisyTotal.value) * 100).toFixed(2) : 0,
        dp_applied: true
      };
    });
    
    res.json({
      data: noisyData,
      range: days,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching explore unlocks:', error);
    res.status(500).json({ error: 'Failed to fetch explore unlock metrics' });
  }
});

// GET /api/kpi/opt-in-rates - Consent opt-in rates
router.get('/opt-in-rates', checkKPIPermission, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM kpi_optin_rates');
    
    if (result.rows.length === 0) {
      return res.json({ data: null, message: 'No opt-in data available' });
    }
    
    const row = result.rows[0];
    
    if (row.privacy_status === 'suppressed') {
      return res.json({
        data: {
          suppressed: true,
          message: 'Insufficient data for privacy-preserving display'
        }
      });
    }
    
    // Apply differential privacy to counts
    const noisyData = {
      total_users: addLaplaceNoise(row.total_users, 1, 0.5).value,
      location_optin: addLaplaceNoise(row.location_optin, 1, 0.5).value,
      orb_optin: addLaplaceNoise(row.orb_optin, 1, 0.5).value,
      reflections_optin: addLaplaceNoise(row.reflections_optin, 1, 0.5).value,
      notifications_optin: addLaplaceNoise(row.notifications_optin, 1, 0.5).value,
      research_optin: addLaplaceNoise(row.research_optin, 1, 0.5).value,
    };
    
    // Recalculate percentages with noisy data
    const total = noisyData.total_users;
    noisyData.location_percent = total > 0 ? ((noisyData.location_optin / total) * 100).toFixed(2) : 0;
    noisyData.orb_percent = total > 0 ? ((noisyData.orb_optin / total) * 100).toFixed(2) : 0;
    noisyData.reflections_percent = total > 0 ? ((noisyData.reflections_optin / total) * 100).toFixed(2) : 0;
    noisyData.notifications_percent = total > 0 ? ((noisyData.notifications_optin / total) * 100).toFixed(2) : 0;
    noisyData.research_percent = total > 0 ? ((noisyData.research_optin / total) * 100).toFixed(2) : 0;
    noisyData.dp_applied = true;
    
    res.json({
      data: noisyData,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching opt-in rates:', error);
    res.status(500).json({ error: 'Failed to fetch opt-in rates' });
  }
});

// GET /api/kpi/staff-usage - Staff dashboard usage
router.get('/staff-usage', checkKPIPermission, async (req, res) => {
  try {
    const query = `
      SELECT * FROM kpi_staff_dashboard_use
      ORDER BY week DESC
      LIMIT 4
    `;
    
    const result = await pool.query(query);
    
    const noisyData = result.rows.map(row => {
      if (row.privacy_status === 'suppressed') {
        return { ...row, total_staff: null, staff_with_views: null, usage_percent: null };
      }
      
      const noisyTotal = addLaplaceNoise(row.total_staff, 1, 0.5);
      const noisyWithViews = addLaplaceNoise(row.staff_with_views, 1, 0.5);
      
      return {
        ...row,
        total_staff: noisyTotal.value,
        staff_with_views: noisyWithViews.value,
        usage_percent: noisyTotal.value > 0 ? 
          ((noisyWithViews.value / noisyTotal.value) * 100).toFixed(2) : 0,
        dp_applied: true
      };
    });
    
    res.json({
      data: noisyData,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching staff usage:', error);
    res.status(500).json({ error: 'Failed to fetch staff usage metrics' });
  }
});

// GET /api/kpi/referral-conversion - Referral conversion rates
router.get('/referral-conversion', checkKPIPermission, async (req, res) => {
  try {
    const query = `
      SELECT * FROM kpi_referral_conversion
      WHERE privacy_status = 'visible'
      ORDER BY unique_views DESC
      LIMIT 20
    `;
    
    const result = await pool.query(query);
    
    const noisyData = result.rows.map(row => {
      const noisyViews = addLaplaceNoise(row.unique_views, 1, 0.5);
      const noisySignups = addLaplaceNoise(row.signups, 1, 0.5);
      
      return {
        ...row,
        unique_views: noisyViews.value,
        signups: noisySignups.value,
        conversion_percent: noisyViews.value > 0 ? 
          ((noisySignups.value / noisyViews.value) * 100).toFixed(2) : 0,
        dp_applied: true
      };
    });
    
    res.json({
      data: noisyData,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching referral conversion:', error);
    res.status(500).json({ error: 'Failed to fetch referral conversion metrics' });
  }
});

// GET /api/kpi/crisis-routing - Crisis response times
router.get('/crisis-routing', checkKPIPermission, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM kpi_crisis_routing');
    
    if (result.rows.length === 0) {
      return res.json({ data: null, message: 'No crisis routing data available' });
    }
    
    const row = result.rows[0];
    
    if (row.privacy_status === 'suppressed') {
      return res.json({
        data: {
          suppressed: true,
          message: 'Insufficient data for privacy-preserving display'
        }
      });
    }
    
    // Apply differential privacy to counts
    const noisyData = {
      total_crisis_events: addLaplaceNoise(row.total_crisis_events || 0, 1, 0.5).value,
      events_with_support: addLaplaceNoise(row.events_with_support || 0, 1, 0.5).value,
      median_minutes: row.median_minutes ? addLaplaceNoise(row.median_minutes, 5, 0.5).value : null,
      q1_minutes: row.q1_minutes ? addLaplaceNoise(row.q1_minutes, 5, 0.5).value : null,
      q3_minutes: row.q3_minutes ? addLaplaceNoise(row.q3_minutes, 5, 0.5).value : null,
      dp_applied: true
    };
    
    res.json({
      data: noisyData,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching crisis routing:', error);
    res.status(500).json({ error: 'Failed to fetch crisis routing metrics' });
  }
});

// GET /api/kpi/summary - Get all KPIs in summary format
router.get('/summary', checkKPIPermission, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM kpi_dashboard_summary');
    
    if (result.rows.length === 0) {
      return res.json({ data: null, message: 'No summary data available' });
    }
    
    const summary = result.rows[0];
    
    // Apply differential privacy to nested JSON data
    if (summary.daily_checkins) {
      summary.daily_checkins.dau = addLaplaceNoise(summary.daily_checkins.dau || 0, 1, 0.5).value;
      summary.daily_checkins.total_checkins = addLaplaceNoise(summary.daily_checkins.total_checkins || 0, 1, 0.5).value;
    }
    
    if (summary.streak_completion) {
      summary.streak_completion.total_active_users = addLaplaceNoise(summary.streak_completion.total_active_users || 0, 1, 0.5).value;
      summary.streak_completion.users_with_streak = addLaplaceNoise(summary.streak_completion.users_with_streak || 0, 1, 0.5).value;
    }
    
    res.json({
      data: summary,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching KPI summary:', error);
    res.status(500).json({ error: 'Failed to fetch KPI summary' });
  }
});

// GET /api/kpi/export - Export all KPI data as CSV
router.get('/export', checkKPIPermission, async (req, res) => {
  try {
    const days = getDateFilter(req);
    
    // Fetch all KPI data
    const [
      dailyCheckins,
      streakCompletion,
      exploreUnlocks,
      optInRates,
      staffUsage,
      crisisRouting
    ] = await Promise.all([
      pool.query(`
        SELECT * FROM kpi_daily_checkin_rate 
        WHERE day >= CURRENT_DATE - INTERVAL '${days} days'
        AND privacy_status = 'visible'
        ORDER BY day DESC
      `),
      pool.query('SELECT * FROM kpi_streak_completion WHERE privacy_status = \'visible\''),
      pool.query(`
        SELECT * FROM kpi_explore_unlock 
        WHERE checkin_date >= CURRENT_DATE - INTERVAL '${days} days'
        AND privacy_status = 'visible'
        ORDER BY checkin_date DESC
      `),
      pool.query('SELECT * FROM kpi_optin_rates WHERE privacy_status = \'visible\''),
      pool.query('SELECT * FROM kpi_staff_dashboard_use WHERE privacy_status = \'visible\' ORDER BY week DESC LIMIT 4'),
      pool.query('SELECT * FROM kpi_crisis_routing WHERE privacy_status = \'visible\'')
    ]);
    
    // Create CSV data with differential privacy applied
    const csvData = [];
    
    // Add daily checkins data
    dailyCheckins.rows.forEach(row => {
      csvData.push({
        metric_type: 'daily_checkins',
        date: row.day,
        value_1: addLaplaceNoise(row.dau, 1, 0.5).value,
        value_2: addLaplaceNoise(row.total_checkins, 1, 0.5).value,
        value_3: row.checkins_per_user,
        label_1: 'DAU',
        label_2: 'Total Checkins',
        label_3: 'Checkins Per User'
      });
    });
    
    // Add streak completion data
    if (streakCompletion.rows[0]) {
      const row = streakCompletion.rows[0];
      csvData.push({
        metric_type: 'streak_completion',
        date: new Date().toISOString().split('T')[0],
        value_1: addLaplaceNoise(row.total_active_users, 1, 0.5).value,
        value_2: addLaplaceNoise(row.users_with_streak, 1, 0.5).value,
        value_3: row.streak_completion_percent,
        label_1: 'Active Users',
        label_2: 'Users with 7-Day Streak',
        label_3: 'Completion Percent'
      });
    }
    
    // Add explore unlock data
    exploreUnlocks.rows.forEach(row => {
      csvData.push({
        metric_type: 'explore_unlocks',
        date: row.checkin_date,
        value_1: addLaplaceNoise(row.total_users, 1, 0.5).value,
        value_2: addLaplaceNoise(row.users_unlocked, 1, 0.5).value,
        value_3: row.unlock_compliance_percent,
        label_1: 'Total Users',
        label_2: 'Users Unlocked',
        label_3: 'Compliance Percent'
      });
    });
    
    // Add opt-in rates data
    if (optInRates.rows[0]) {
      const row = optInRates.rows[0];
      csvData.push({
        metric_type: 'opt_in_rates',
        date: new Date().toISOString().split('T')[0],
        value_1: addLaplaceNoise(row.total_users, 1, 0.5).value,
        value_2: row.location_percent,
        value_3: row.orb_percent,
        label_1: 'Total Users',
        label_2: 'Location Opt-in %',
        label_3: 'Orb Sharing %'
      });
    }
    
    // Add staff usage data
    staffUsage.rows.forEach(row => {
      csvData.push({
        metric_type: 'staff_usage',
        date: row.week,
        value_1: addLaplaceNoise(row.total_staff, 1, 0.5).value,
        value_2: addLaplaceNoise(row.staff_with_views, 1, 0.5).value,
        value_3: row.usage_percent,
        label_1: 'Total Staff',
        label_2: 'Staff with Views',
        label_3: 'Usage Percent'
      });
    });
    
    // Add crisis routing data
    if (crisisRouting.rows[0]) {
      const row = crisisRouting.rows[0];
      csvData.push({
        metric_type: 'crisis_routing',
        date: new Date().toISOString().split('T')[0],
        value_1: addLaplaceNoise(row.total_crisis_events || 0, 1, 0.5).value,
        value_2: addLaplaceNoise(row.events_with_support || 0, 1, 0.5).value,
        value_3: row.median_minutes ? addLaplaceNoise(row.median_minutes, 5, 0.5).value : null,
        label_1: 'Total Crisis Events',
        label_2: 'Events with Support',
        label_3: 'Median Response (minutes)'
      });
    }
    
    // Convert to CSV
    if (csvData.length === 0) {
      return res.status(404).json({ error: 'No data available for export' });
    }
    
    const json2csvParser = new Parser({
      fields: ['metric_type', 'date', 'label_1', 'value_1', 'label_2', 'value_2', 'label_3', 'value_3']
    });
    const csv = json2csvParser.parse(csvData);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="kpi-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
    
  } catch (error) {
    console.error('Error exporting KPI data:', error);
    res.status(500).json({ error: 'Failed to export KPI data' });
  }
});

export default router;