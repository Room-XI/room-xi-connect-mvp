import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { checkins, programs, savedPrograms, ximiConversations, profiles, privacyConsents, dpApplications } from '../schema.js';
import { applyDifferentialPrivacy, applyDPToStats } from '../lib/differentialPrivacy.js';
import { Parser } from 'json2csv';
import { applyDPWithLogging, addNoiseWithLogging } from '../middleware/differentialPrivacy.js';
import logger from '../logger.ts';

const router = Router();

/**
 * Get aggregated transparency statistics with differential privacy
 * Public endpoint - no authentication required
 */
router.get('/stats', async (req, res) => {
  try {
    // Get current date in Mountain Time
    const now = new Date();
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'America/Edmonton' }));
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Query 1: Active users in last 30 days
    const activeUsersResult = await db
      .select({ count: sql`COUNT(DISTINCT user_id)` })
      .from(checkins)
      .where(sql`created_at >= ${monthAgo.toISOString()}`);
    
    // Query 2: Daily check-ins today
    const dailyCheckInsResult = await db
      .select({ count: sql`COUNT(*)` })
      .from(checkins)
      .where(sql`created_at >= ${today.toISOString()}`);
    
    // Query 3: Streaks completed this week (7+ day streaks)
    const streaksResult = await db
      .select({ count: sql`COUNT(*)` })
      .from(profiles)
      .where(sql`streak_count >= 7`);
    
    // Query 4: Programs engaged (saved programs) in last 30 days
    const programsEngagedResult = await db
      .select({ count: sql`COUNT(DISTINCT program_id)` })
      .from(savedPrograms)
      .where(sql`created_at >= ${monthAgo.toISOString()}`);
    
    // Query 5: Ximi interactions in last 30 days
    const ximiResult = await db
      .select({ count: sql`COUNT(*)` })
      .from(ximiConversations)
      .where(sql`created_at >= ${monthAgo.toISOString()}`);
    
    // Query 6: Crisis support provided (check-ins with crisis detected)
    const crisisResult = await db
      .select({ count: sql`COUNT(*)` })
      .from(checkins)
      .where(sql`crisis_flagged = true AND created_at >= ${monthAgo.toISOString()}`);

    // Extract counts
    const activeUsers = Number(activeUsersResult[0]?.count || 0);
    const dailyCheckIns = Number(dailyCheckInsResult[0]?.count || 0);
    const streaksCompleted = Number(streaksResult[0]?.count || 0);
    const programsEngaged = Number(programsEngagedResult[0]?.count || 0);
    const ximiInteractions = Number(ximiResult[0]?.count || 0);
    const crisisSupport = Number(crisisResult[0]?.count || 0);

    // Apply differential privacy with logging
    const stats = await applyDPWithLogging(
      {
        activeUsers,
        dailyCheckIns,
        streaksCompleted,
        programsEngaged,
        ximiInteractions,
        crisisSupport
      },
      activeUsers,
      'transparency_stats',
      'multiple'
    );

    // Check if data was suppressed
    if (stats.suppressed) {
      return res.json({
        data: null,
        suppressed: true,
        message: stats.reason || 'Insufficient data for privacy-preserving display',
        metadata: {
          minThreshold: 7,
          noiseApplied: false
        }
      });
    }

    // Add metadata about privacy protection
    const privacyMetadata = {
      noiseApplied: stats.noiseAdded,
      epsilon: stats.dpEpsilon || 0.5,
      nCount: stats.nCount,
      mechanism: stats.mechanism,
      lastUpdated: new Date().toISOString()
    };

    // Remove DP metadata from stats object before sending
    const { noiseAdded, nCount, dpEpsilon, mechanism, ...cleanStats } = stats;

    res.json({
      ...cleanStats,
      privacyMetadata
    });
    
  } catch (error) {
    logger.error({ err: error, context: 'transparency-stats' }, 'Error fetching transparency stats');
    res.status(500).json({ 
      error: 'Failed to fetch transparency data',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get community mood distribution (aggregated, anonymized)
 */
router.get('/mood-distribution', async (req, res) => {
  try {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Get mood distribution for the past 30 days
    const moodDistribution = await db
      .select({
        mood: checkins.moodType,
        count: sql`COUNT(*)::int`
      })
      .from(checkins)
      .where(sql`created_at >= ${monthAgo.toISOString()}`)
      .groupBy(checkins.moodType);

    // Convert to object and apply differential privacy with logging
    const distribution = {};
    for (const row of moodDistribution) {
      if (row.mood) {
        const count = Number(row.count);
        // Apply N >= 7 threshold with logging
        if (count >= 7) {
          const noisyResult = await addNoiseWithLogging(
            count,
            `mood_distribution_${row.mood}`,
            'checkins',
            1
          );
          distribution[row.mood] = noisyResult.value;
        }
      }
    }

    res.json({
      distribution,
      metadata: {
        period: '30_days',
        noiseApplied: process.env.NODE_ENV === 'production',
        epsilon: 0.5,
        minThreshold: 7,
        moodsDisplayed: Object.keys(distribution).length
      }
    });
    
  } catch (error) {
    logger.error({ err: error, context: 'transparency-mood-distribution' }, 'Error fetching mood distribution');
    res.status(500).json({ 
      error: 'Failed to fetch mood distribution' 
    });
  }
});

/**
 * Get consent opt-in rates (public, anonymized)
 */
router.get('/opt-in-rates', async (req, res) => {
  try {
    // Get total users count
    const totalUsersResult = await db
      .select({ count: sql`COUNT(*)::int` })
      .from(profiles);
    
    const totalUsers = Number(totalUsersResult[0]?.count || 0);
    
    // Only proceed if we have enough users (N >= 7 threshold)
    if (totalUsers < 7) {
      return res.json({
        data: null,
        message: 'Insufficient data for privacy-preserving display',
        metadata: {
          minThreshold: 7
        }
      });
    }

    // Get consent opt-in counts for different features
    const consentStats = await db
      .select({
        location_optin: sql`COUNT(CASE WHEN location_sharing = true THEN 1 END)::int`,
        orb_optin: sql`COUNT(CASE WHEN orb_sharing = true THEN 1 END)::int`,
        reflections_optin: sql`COUNT(CASE WHEN reflections_sharing = true THEN 1 END)::int`,
        notifications_optin: sql`COUNT(CASE WHEN notifications_enabled = true THEN 1 END)::int`,
      })
      .from(privacyConsents);

    const stats = consentStats[0] || {};
    
    // Apply differential privacy with logging to all counts
    const noisyStats = await applyDPWithLogging(
      {
        totalUsers,
        locationOptIn: Number(stats.location_optin || 0),
        orbOptIn: Number(stats.orb_optin || 0),
        reflectionsOptIn: Number(stats.reflections_optin || 0),
        notificationsOptIn: Number(stats.notifications_optin || 0)
      },
      totalUsers,
      'opt_in_rates',
      'privacy_consents'
    );

    // Check if data was suppressed
    if (noisyStats.suppressed) {
      return res.json({
        data: null,
        suppressed: true,
        message: noisyStats.reason || 'Insufficient data for privacy-preserving display',
        metadata: {
          minThreshold: 7,
          noiseApplied: false
        }
      });
    }

    // Calculate percentages with noisy data
    const data = {
      totalUsers: noisyStats.totalUsers,
      locationOptInRate: ((noisyStats.locationOptIn / noisyStats.totalUsers) * 100).toFixed(1),
      orbSharingRate: ((noisyStats.orbOptIn / noisyStats.totalUsers) * 100).toFixed(1),
      reflectionsSharingRate: ((noisyStats.reflectionsOptIn / noisyStats.totalUsers) * 100).toFixed(1),
      notificationsOptInRate: ((noisyStats.notificationsOptIn / noisyStats.totalUsers) * 100).toFixed(1)
    };

    res.json({
      data,
      metadata: {
        noiseApplied: noisyStats.noiseAdded,
        epsilon: noisyStats.dpEpsilon || 0.5,
        nCount: noisyStats.nCount,
        minThreshold: 7
      }
    });
  } catch (error) {
    logger.error({ err: error, context: 'transparency-opt-in-rates' }, 'Error fetching opt-in rates');
    res.status(500).json({ 
      error: 'Failed to fetch opt-in rates' 
    });
  }
});

/**
 * Public KPI export endpoint with differential privacy
 * Returns CSV file with all aggregated KPI metrics
 */
router.get('/kpi-export', async (req, res) => {
  try {
    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    // Gather all KPI data with proper thresholds
    const [
      statsResult,
      moodResult,
      optInResult
    ] = await Promise.all([
      // Basic stats
      db.select({ 
        activeUsers: sql`COUNT(DISTINCT user_id)::int` 
      })
      .from(checkins)
      .where(sql`created_at >= ${monthAgo.toISOString()}`),
      
      // Mood distribution
      db.select({
        mood: checkins.moodType,
        count: sql`COUNT(*)::int`
      })
      .from(checkins)
      .where(sql`created_at >= ${monthAgo.toISOString()}`)
      .groupBy(checkins.moodType),
      
      // Opt-in rates
      db.select({
        total: sql`COUNT(*)::int`,
        location: sql`COUNT(CASE WHEN location_sharing = true THEN 1 END)::int`,
        orb: sql`COUNT(CASE WHEN orb_sharing = true THEN 1 END)::int`
      })
      .from(privacyConsents)
    ]);

    // Process the data into CSV format
    const csvData = [];
    
    // Add general stats
    const activeUsers = Number(statsResult[0]?.activeUsers || 0);
    if (activeUsers >= 7) {
      const noisyActive = applyDifferentialPrivacy({ count: activeUsers });
      csvData.push({
        metric_type: 'active_users_30_days',
        value: noisyActive.count,
        date: new Date().toISOString().split('T')[0],
        privacy_applied: 'true',
        threshold_met: 'true'
      });
    }
    
    // Add mood distribution (only include if count >= 7)
    moodResult.forEach(row => {
      const count = Number(row.count);
      if (count >= 7) {
        const noisyCount = applyDifferentialPrivacy({ count });
        csvData.push({
          metric_type: 'mood_distribution',
          value: noisyCount.count,
          mood_type: row.mood || 'unknown',
          date: new Date().toISOString().split('T')[0],
          privacy_applied: 'true',
          threshold_met: 'true'
        });
      }
    });
    
    // Add opt-in rates
    const totalUsers = Number(optInResult[0]?.total || 0);
    if (totalUsers >= 7) {
      const noisyTotal = applyDifferentialPrivacy({ count: totalUsers });
      const noisyLocation = applyDifferentialPrivacy({ count: Number(optInResult[0]?.location || 0) });
      const noisyOrb = applyDifferentialPrivacy({ count: Number(optInResult[0]?.orb || 0) });
      
      csvData.push({
        metric_type: 'opt_in_rates',
        value: ((noisyLocation.count / noisyTotal.count) * 100).toFixed(1),
        consent_type: 'location',
        date: new Date().toISOString().split('T')[0],
        privacy_applied: 'true',
        threshold_met: 'true'
      });
      
      csvData.push({
        metric_type: 'opt_in_rates',
        value: ((noisyOrb.count / noisyTotal.count) * 100).toFixed(1),
        consent_type: 'orb_sharing',
        date: new Date().toISOString().split('T')[0],
        privacy_applied: 'true',
        threshold_met: 'true'
      });
    }
    
    if (csvData.length === 0) {
      return res.status(404).json({ 
        error: 'Insufficient data for privacy-preserving export',
        minThreshold: 7 
      });
    }
    
    // Convert to CSV
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(csvData);
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="transparency-kpi-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
    
  } catch (error) {
    logger.error({ err: error, context: 'transparency-kpi-export' }, 'Error exporting transparency KPI data');
    res.status(500).json({ 
      error: 'Failed to export KPI data' 
    });
  }
});

export default router;