import express from 'express';
import { db } from '../db.js';
import { privacyConsents, consentAuditLog, consentReminders, dpApplications, xids } from '../schema.js';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import { applyDPToStats, logDPApplication } from '../lib/differentialPrivacy.js';

const router = express.Router();

/**
 * Hash IP address for privacy
 */
function hashIP(ip) {
  return crypto.createHash('sha256').update(ip || 'unknown').digest('hex');
}

/**
 * Get user's XID for audit logging
 */
async function getUserXid(userId) {
  const [xid] = await db
    .select({ id: xids.id })
    .from(xids)
    .where(and(
      eq(xids.userId, userId),
      sql`${xids.tombstonedAt} IS NULL`
    ))
    .limit(1);
    
  return xid?.id || 'unknown';
}

/**
 * Log consent change to audit trail
 */
async function logConsentChange(userId, consentType, previousValue, newValue, source, req) {
  const userXid = await getUserXid(userId);
  
  await db.insert(consentAuditLog).values({
    userXid,
    consentType,
    action: newValue ? 'granted' : 'revoked',
    previousValue,
    newValue,
    source,
    ipAddressHash: hashIP(req.ip),
    userAgent: req.headers['user-agent'] || 'unknown',
  });
}

/**
 * GET /api/privacy/consents
 * Get current user's privacy consent settings
 */
router.get('/consents', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get or create privacy consents
    let [consent] = await db
      .select()
      .from(privacyConsents)
      .where(eq(privacyConsents.userId, req.session.userId))
      .limit(1);

    // Create default consents if not exists (all OFF)
    if (!consent) {
      [consent] = await db
        .insert(privacyConsents)
        .values({
          userId: req.session.userId,
          locationSharing: false,
          orbSharing: false,
          reflectionsSharing: false,
          notificationsEnabled: false,
          researchParticipation: false,
          dailyQuotesEnabled: false,
          reminderEnabled: false,
          reminderCount: 0,
        })
        .returning();

      // Log initial consent creation
      await logConsentChange(
        req.session.userId,
        'initial_setup',
        null,
        false,
        'account_creation',
        req
      );
    }

    res.json({
      consents: {
        location: consent.locationSharing,
        orb: consent.orbSharing,
        reflections: consent.reflectionsSharing,
        notifications: consent.notificationsEnabled,
        research: consent.researchParticipation,
        dailyQuotes: consent.dailyQuotesEnabled || false,
      },
      reminder: {
        enabled: consent.reminderEnabled,
        lastSent: consent.lastReminderSent,
        count: consent.reminderCount,
      },
      lastUpdated: consent.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching privacy consents:', error);
    res.status(500).json({ error: 'Failed to fetch privacy settings' });
  }
});

/**
 * PUT /api/privacy/consents
 * Update privacy consent settings
 */
router.put('/consents', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { consents, reminderEnabled } = req.body;

    if (!consents || typeof consents !== 'object') {
      return res.status(400).json({ error: 'Invalid consent data' });
    }

    // Get current consents for comparison
    const [currentConsent] = await db
      .select()
      .from(privacyConsents)
      .where(eq(privacyConsents.userId, req.session.userId))
      .limit(1);

    // Map consent keys to database columns
    const consentMapping = {
      location: 'locationSharing',
      orb: 'orbSharing',
      reflections: 'reflectionsSharing',
      notifications: 'notificationsEnabled',
      research: 'researchParticipation',
      dailyQuotes: 'dailyQuotesEnabled',
    };

    // Prepare update values
    const updateValues = {};
    const auditPromises = [];

    // Check each consent and log changes
    for (const [key, dbField] of Object.entries(consentMapping)) {
      if (key in consents) {
        const newValue = Boolean(consents[key]);
        const oldValue = currentConsent ? currentConsent[dbField] : false;
        
        updateValues[dbField] = newValue;
        
        if (newValue !== oldValue) {
          auditPromises.push(
            logConsentChange(
              req.session.userId,
              key,
              oldValue,
              newValue,
              'settings',
              req
            )
          );
        }
      }
    }

    // Handle reminder settings
    if (reminderEnabled !== undefined) {
      updateValues.reminderEnabled = Boolean(reminderEnabled);
    }

    // Update privacy consents
    const [updated] = await db
      .update(privacyConsents)
      .set({
        ...updateValues,
        updatedAt: new Date(),
      })
      .where(eq(privacyConsents.userId, req.session.userId))
      .returning();

    // Execute audit logs
    await Promise.all(auditPromises);

    res.json({
      success: true,
      consents: {
        location: updated.locationSharing,
        orb: updated.orbSharing,
        reflections: updated.reflectionsSharing,
        notifications: updated.notificationsEnabled,
        research: updated.researchParticipation,
        dailyQuotes: updated.dailyQuotesEnabled || false,
      },
      reminder: {
        enabled: updated.reminderEnabled,
        lastSent: updated.lastReminderSent,
        count: updated.reminderCount,
      },
    });
  } catch (error) {
    console.error('Error updating privacy consents:', error);
    res.status(500).json({ error: 'Failed to update privacy settings' });
  }
});

/**
 * GET /api/privacy/audit-log
 * Get user's consent audit history
 */
router.get('/audit-log', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userXid = await getUserXid(req.session.userId);
    
    // Get audit logs for this user
    const logs = await db
      .select({
        consentType: consentAuditLog.consentType,
        action: consentAuditLog.action,
        previousValue: consentAuditLog.previousValue,
        newValue: consentAuditLog.newValue,
        source: consentAuditLog.source,
        timestamp: consentAuditLog.timestamp,
      })
      .from(consentAuditLog)
      .where(eq(consentAuditLog.userXid, userXid))
      .orderBy(desc(consentAuditLog.timestamp))
      .limit(100);

    res.json({
      logs,
      userXid,
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ error: 'Failed to fetch audit history' });
  }
});

/**
 * POST /api/privacy/reminder-response
 * Record user response to privacy reminder
 */
router.post('/reminder-response', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { action } = req.body;

    if (!['viewed', 'updated', 'dismissed'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    // Find the most recent reminder
    const [reminder] = await db
      .select()
      .from(consentReminders)
      .where(and(
        eq(consentReminders.userId, req.session.userId),
        sql`${consentReminders.responseAt} IS NULL`
      ))
      .orderBy(desc(consentReminders.sentAt))
      .limit(1);

    if (reminder) {
      // Update reminder with response
      await db
        .update(consentReminders)
        .set({
          responseAt: new Date(),
          responseAction: action,
        })
        .where(eq(consentReminders.id, reminder.id));
    }

    // If action is 'viewed' or 'updated', log it
    if (action !== 'dismissed') {
      await logConsentChange(
        req.session.userId,
        'reminder_interaction',
        null,
        null,
        `reminder_${action}`,
        req
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error recording reminder response:', error);
    res.status(500).json({ error: 'Failed to record response' });
  }
});

/**
 * GET /api/privacy/export
 * Export all user data (PIPEDA/GDPR compliance)
 */
router.get('/export', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { checkins, profiles, savedPrograms, journalEntries, ximiConversations, healthProfiles, attendance } = await import('../schema.js');
    
    // Get user profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    // Get check-ins
    const userCheckins = await db
      .select()
      .from(checkins)
      .where(eq(checkins.userId, req.session.userId))
      .orderBy(desc(checkins.timestamp));

    // Get saved programs
    const userSavedPrograms = await db
      .select()
      .from(savedPrograms)
      .where(eq(savedPrograms.userId, req.session.userId));

    // Get journal entries
    const userJournalEntries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.userId, req.session.userId))
      .orderBy(desc(journalEntries.createdAt));

    // Get Ximi conversations
    const userXimiConversations = await db
      .select()
      .from(ximiConversations)
      .where(eq(ximiConversations.userId, req.session.userId))
      .orderBy(desc(ximiConversations.createdAt));

    // Get health profile (if exists)
    const [healthProfile] = await db
      .select()
      .from(healthProfiles)
      .where(eq(healthProfiles.userId, req.session.userId))
      .limit(1);

    // Get attendance records via user's XID
    const userXidsData = await db
      .select({ xidId: xids.id })
      .from(xids)
      .where(and(
        eq(xids.userId, req.session.userId),
        sql`${xids.tombstonedAt} IS NULL`
      ));
    
    const userXidIds = userXidsData.map(x => x.xidId);
    
    let userAttendance = [];
    if (userXidIds.length > 0) {
      userAttendance = await db
        .select()
        .from(attendance)
        .where(inArray(attendance.xidId, userXidIds))
        .orderBy(desc(attendance.timestamp));
    }

    // Get privacy consents
    const [privacyConsentData] = await db
      .select()
      .from(privacyConsents)
      .where(eq(privacyConsents.userId, req.session.userId))
      .limit(1);

    // Get consent audit log
    const userXid = await getUserXid(req.session.userId);
    const auditLogs = await db
      .select()
      .from(consentAuditLog)
      .where(eq(consentAuditLog.userXid, userXid))
      .orderBy(desc(consentAuditLog.timestamp));

    // Compile all data
    const exportData = {
      exportedAt: new Date().toISOString(),
      userId: req.session.userId,
      profile: profile || null,
      checkins: userCheckins || [],
      savedPrograms: userSavedPrograms || [],
      journalEntries: userJournalEntries || [],
      ximiConversations: userXimiConversations || [],
      healthProfile: healthProfile || null,
      attendance: userAttendance || [],
      privacyConsents: privacyConsentData || null,
      consentAuditLog: auditLogs || [],
    };

    // Log export event
    await logConsentChange(
      req.session.userId,
      'data_export',
      null,
      true,
      'export_request',
      req
    );

    // Set filename with timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `room-xi-data-export-${timestamp}.json`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (error) {
    console.error('Error exporting user data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

/**
 * GET /api/privacy/aggregate-stats
 * Get anonymized aggregate privacy stats (with DP)
 */
router.get('/aggregate-stats', async (req, res) => {
  try {
    // Get total user count
    const [userCount] = await db
      .select({ count: sql`count(*)::int` })
      .from(privacyConsents);

    const totalUsers = userCount?.count || 0;

    // Get consent counts
    const [consentStats] = await db
      .select({
        locationCount: sql`count(*) filter (where location_sharing = true)::int`,
        orbCount: sql`count(*) filter (where orb_sharing = true)::int`,
        reflectionsCount: sql`count(*) filter (where reflections_sharing = true)::int`,
        notificationsCount: sql`count(*) filter (where notifications_enabled = true)::int`,
        researchCount: sql`count(*) filter (where research_participation = true)::int`,
      })
      .from(privacyConsents);

    // Apply differential privacy
    const noisyStats = applyDPToStats(consentStats, totalUsers);

    // Log DP application
    if (!noisyStats.suppressed) {
      await db.insert(dpApplications).values({
        operation: 'privacy_aggregate_stats',
        tableName: 'privacy_consents',
        queryType: 'aggregate',
        originalCount: totalUsers,
        noiseAdded: noisyStats.noiseAdded,
        epsilon: '0.50',
        mechanism: 'laplace',
        metadata: { endpoint: '/api/privacy/aggregate-stats' },
      });

      logDPApplication('privacy_aggregate_stats', noisyStats);
    }

    res.json({
      stats: noisyStats,
      disclaimer: 'Aggregate statistics include differential privacy noise for user protection',
    });
  } catch (error) {
    console.error('Error fetching aggregate stats:', error);
    res.status(500).json({ error: 'Failed to fetch aggregate statistics' });
  }
});

export default router;