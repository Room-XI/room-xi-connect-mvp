import { DateTime } from 'luxon';
import { checkMorningNudges } from '../routes/notifications.ts';
import { sendCheckinReminder, pushEnabled } from './pushNotification.ts';
import { computeTrendsForAllUsers } from './moodTrends.ts';
import { computePeerInsightsForAllPrograms } from './peerInsights.ts';
import { checkAndSendFollowups } from './crisisFollowup.ts';
import { db } from '../db.js';
import { privacyConsents, checkins, profiles, ximiConversations, guardianVerifications, programs } from '../schema.js';
import { eq, and, lt, sql, isNull, isNotNull } from 'drizzle-orm';
import { sendGuardianVerificationEmail } from './email.js';
import { getPublicUrl } from '../utils/publicUrl.ts';
import logger from '../logger.ts';

// T033: orbSnapshots route + service deleted (out-of-pilot). The scheduled
// weekly-snapshot job is intentionally retained as a no-op so the cron
// timing/log surface stays stable; if orb snapshots ever return to scope,
// re-import the real implementation here. Logs `skipped: true` so ops can
// see the job ran without doing work.
const captureAllWeeklySnapshots = async () => {
  logger.info({ context: 'scheduler', feature: 'orb-snapshots' }, 'Weekly snapshot job invoked but feature is out-of-pilot — skipping');
  return { skipped: true, reason: 'orb-snapshots out-of-pilot' };
};

// Store the interval ID for the scheduler
let schedulerInterval = null;

/**
 * Check if current time matches Sunday 08:00 America/Edmonton
 */
function shouldRunWeeklySnapshot() {
  const now = DateTime.now().setZone('America/Edmonton');
  
  // Check if it's Sunday (weekday 7 in Luxon) and around 08:00
  if (now.weekday === 7) { // Sunday
    const hour = now.hour;
    const minute = now.minute;
    
    // Run at 08:00-08:05 to account for small timing variations
    return hour === 8 && minute >= 0 && minute < 5;
  }
  
  return false;
}

/**
 * Calculate milliseconds until next Sunday 08:00 America/Edmonton
 */
function msUntilNextSundaySnapshot() {
  const now = DateTime.now().setZone('America/Edmonton');
  
  // Find next Sunday at 08:00
  let nextSunday = now.set({ hour: 8, minute: 0, second: 0, millisecond: 0 });
  
  // If we're already past Sunday 08:00, go to next week
  if (now.weekday === 7 && now.hour >= 8) {
    nextSunday = nextSunday.plus({ weeks: 1 });
  } else {
    // Calculate days until Sunday (weekday 7)
    const daysUntilSunday = (7 - now.weekday + 7) % 7 || 7;
    nextSunday = nextSunday.plus({ days: daysUntilSunday });
  }
  
  return nextSunday.diff(now).milliseconds;
}

/**
 * Check if current time matches 8:00 AM America/Edmonton for check-in reminders
 */
function shouldRunCheckinReminder() {
  const now = DateTime.now().setZone('America/Edmonton');
  const hour = now.hour;
  const minute = now.minute;
  
  // Run at 08:00-08:05 to account for timing variations
  return hour === 8 && minute >= 0 && minute < 5;
}

/**
 * Check if current time matches 10:00 AM America/Edmonton for morning nudges
 */
function shouldRunMorningNudge() {
  const now = DateTime.now().setZone('America/Edmonton');
  const hour = now.hour;
  const minute = now.minute;
  
  // Run at 10:00-10:05 to account for timing variations
  return hour === 10 && minute >= 0 && minute < 5;
}

/**
 * Check if current time matches Monday 09:00 AM America/Edmonton for trend computation
 */
function shouldRunTrendComputation() {
  const now = DateTime.now().setZone('America/Edmonton');
  const hour = now.hour;
  const minute = now.minute;
  
  // Run at 09:00-09:05 on Mondays (weekday 1 in Luxon)
  return now.weekday === 1 && hour === 9 && minute >= 0 && minute < 5;
}

/**
 * Check if current time matches Monday 09:30 AM America/Edmonton for peer insights computation
 */
function shouldRunPeerInsights() {
  const now = DateTime.now().setZone('America/Edmonton');
  const hour = now.hour;
  const minute = now.minute;
  
  // Run at 09:30-09:35 on Mondays (weekday 1 in Luxon)
  return now.weekday === 1 && hour === 9 && minute >= 30 && minute < 35;
}

/**
 * Send check-in reminders via push notifications
 */
async function sendCheckinReminders() {
  try {
    if (!pushEnabled) {
      logger.info({ context: 'scheduler' }, 'Push notifications disabled - skipping check-in reminders');
      return;
    }

    const now = DateTime.now().setZone('America/Edmonton');
    const today = now.toISODate();
    
    logger.info({ context: 'scheduler' }, `Sending check-in reminders at ${now.toISO()}`);

    // Get users with notifications enabled
    const usersWithNotifications = await db
      .select({
        userId: privacyConsents.userId,
      })
      .from(privacyConsents)
      .where(eq(privacyConsents.notificationsEnabled, true));

    let sentCount = 0;
    let skippedCount = 0;

    for (const user of usersWithNotifications) {
      try {
        // Check if user already checked in today
        const [todayCheckin] = await db
          .select()
          .from(checkins)
          .where(and(
            eq(checkins.userId, user.userId),
            eq(checkins.checkinDate, today)
          ))
          .limit(1);

        if (!todayCheckin) {
          // Send push notification reminder
          const result = await sendCheckinReminder(user.userId);
          if (result.sent > 0) {
            sentCount++;
          } else {
            skippedCount++;
          }
        } else {
          skippedCount++;
        }
      } catch (error) {
        logger.error({ err: error, context: 'scheduler', userId: user.userId }, 'Error sending reminder to user');
      }
    }

    logger.info({ context: 'scheduler', sentCount, skippedCount }, 'Check-in reminders completed');
  } catch (error) {
    logger.error({ err: error, context: 'scheduler' }, 'Error sending check-in reminders');
  }
}

/**
 * Run scheduled tasks
 */
async function runScheduledTasks() {
  try {
    logger.debug({ context: 'scheduler' }, `Checking scheduled tasks at ${DateTime.now().setZone('America/Edmonton').toString()}`);
    
    // Check if we should run weekly snapshot
    if (shouldRunWeeklySnapshot()) {
      logger.info({ context: 'scheduler' }, 'Running weekly orb snapshots...');
      
      try {
        const result = await captureAllWeeklySnapshots();
        logger.info({ context: 'scheduler', result }, 'Weekly snapshots completed');
      } catch (error) {
        logger.error({ err: error, context: 'scheduler' }, 'Failed to capture weekly snapshots');
      }
    }
    
    // Check if we should send check-in reminders at 8:00 AM
    if (shouldRunCheckinReminder()) {
      logger.info({ context: 'scheduler' }, 'Sending check-in reminders...');
      
      try {
        await sendCheckinReminders();
        logger.info({ context: 'scheduler' }, 'Check-in reminders completed');
      } catch (error) {
        logger.error({ err: error, context: 'scheduler' }, 'Failed to send check-in reminders');
      }
    }
    
    // Check if we should run morning nudges at 10:00 AM
    if (shouldRunMorningNudge()) {
      logger.info({ context: 'scheduler' }, 'Running morning nudge check...');
      
      try {
        await checkMorningNudges();
        logger.info({ context: 'scheduler' }, 'Morning nudge check completed');
      } catch (error) {
        logger.error({ err: error, context: 'scheduler' }, 'Failed to check morning nudges');
      }
    }
    
    // Check if we should run trend computation at 9:00 AM on Mondays
    if (shouldRunTrendComputation()) {
      logger.info({ context: 'scheduler' }, 'Running mood trend computation for all users...');
      
      try {
        await computeTrendsForAllUsers();
        logger.info({ context: 'scheduler' }, 'Trend computation completed');
      } catch (error) {
        logger.error({ err: error, context: 'scheduler' }, 'Failed to compute trends');
      }
    }
    
    // Check if we should run peer insights computation at 9:30 AM on Mondays
    if (shouldRunPeerInsights()) {
      logger.info({ context: 'scheduler' }, 'Running peer insights computation for all programs...');
      
      try {
        await computePeerInsightsForAllPrograms();
        logger.info({ context: 'scheduler' }, 'Peer insights computation completed');
      } catch (error) {
        logger.error({ err: error, context: 'scheduler' }, 'Failed to compute peer insights');
      }
    }
    
    // Auto-sunset stale listings at 4:00 AM daily
    if (shouldRunAutoSunset()) {
      logger.info({ context: 'scheduler' }, 'Running auto-sunset check...');
      
      try {
        const result = await runAutoSunset();
        logger.info({ context: 'scheduler', result }, 'Auto-sunset check completed');
      } catch (error) {
        logger.error({ err: error, context: 'scheduler' }, 'Failed to run auto-sunset');
      }
    }

    // Data retention cleanup at 3:00 AM daily
    if (shouldRunDataRetention()) {
      logger.info({ context: 'scheduler' }, 'Running data retention cleanup...');
      
      try {
        await runDataRetentionCleanup();
        logger.info({ context: 'scheduler' }, 'Data retention cleanup completed');
      } catch (error) {
        logger.error({ err: error, context: 'scheduler' }, 'Failed to run data retention cleanup');
      }
    }
    
    // Crisis follow-ups run every 15 minutes to check for due check-ins
    if (shouldRunCrisisFollowups()) {
      logger.info({ context: 'scheduler' }, 'Checking crisis follow-ups...');
      
      try {
        await checkAndSendFollowups();
        logger.info({ context: 'scheduler' }, 'Crisis follow-ups check completed');
      } catch (error) {
        logger.error({ err: error, context: 'scheduler' }, 'Failed to check crisis follow-ups');
      }
    }
  } catch (error) {
    logger.error({ err: error, context: 'scheduler' }, 'Error in scheduled tasks');
  }
}

/**
 * Check if current time is at 0, 15, 30, or 45 minute marks for crisis follow-ups.
 * Uses 5-minute windows to ensure follow-ups are processed even with minor timing variations.
 * The checkAndSendFollowups() function is idempotent - it only processes pending follow-ups
 * that are due, so running multiple times in a window is safe and preferred for reliability.
 */
function shouldRunCrisisFollowups() {
  const now = DateTime.now().setZone('America/Edmonton');
  const minute = now.minute;
  
  // Run every 15 minutes using 5-minute windows for reliability
  return (minute >= 0 && minute < 5) || 
         (minute >= 15 && minute < 20) ||
         (minute >= 30 && minute < 35) ||
         (minute >= 45 && minute < 50);
}

/**
 * Check if current time matches 3:00 AM America/Edmonton for data retention
 */
function shouldRunDataRetention() {
  const now = DateTime.now().setZone('America/Edmonton');
  const hour = now.hour;
  const minute = now.minute;
  
  // Run at 03:00-03:05 to account for timing variations
  return hour === 3 && minute >= 0 && minute < 5;
}

/**
 * Data retention cleanup job
 * Cleans up expired data according to privacy policy
 */
async function runDataRetentionCleanup() {
  const results = {
    expiredDisclosureRequests: 0,
    expiredGuardianInvites: 0,
    orphanedSessions: 0,
    deletedXimiConversations: 0,
    deletedCheckins: 0,
    guardianReminders: 0,
  };
  
  try {
    // 1. Expire old disclosure requests (30 days)
    const disclosureResult = await db.execute(sql`
      UPDATE disclosure_requests 
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'pending' 
        AND expires_at < NOW()
    `);
    results.expiredDisclosureRequests = disclosureResult.rowCount || 0;
    
    // 2. Clean up unverified guardian invites older than 30 days
    const guardianResult = await db.execute(sql`
      DELETE FROM parent_invites 
      WHERE accepted_at IS NULL 
        AND created_at < NOW() - INTERVAL '30 days'
    `);
    results.expiredGuardianInvites = guardianResult.rowCount || 0;
    
    // 3. Clean up expired sessions older than 30 days
    const sessionResult = await db.execute(sql`
      DELETE FROM session 
      WHERE expire < NOW() - INTERVAL '7 days'
    `);
    results.orphanedSessions = sessionResult.rowCount || 0;
    
    // TASK 5: Optional cleanup of old Ximi conversations
    const ximiDays = parseInt(process.env.RETENTION_XIMI_DAYS || '180', 10);
    if (ximiDays > 0) {
      const ximiResult = await db.execute(sql`
        DELETE FROM ximi_conversations
        WHERE created_at < NOW() - INTERVAL '1 day' * ${ximiDays}
      `);
      results.deletedXimiConversations = ximiResult.rowCount || 0;
    }
    
    // TASK 5: Optional cleanup of old check-ins
    const checkinDays = parseInt(process.env.RETENTION_CHECKINS_DAYS || '365', 10);
    if (checkinDays > 0) {
      const checkinResult = await db.execute(sql`
        DELETE FROM checkins
        WHERE timestamp < NOW() - INTERVAL '1 day' * ${checkinDays}
      `);
      results.deletedCheckins = checkinResult.rowCount || 0;
    }
    
    // TASK 11: Send guardian verification reminders after 7 days
    results.guardianReminders = await sendGuardianReminders();
    
    logger.info({ context: 'scheduler', results }, 'Data retention cleanup results');
    return results;
  } catch (error) {
    logger.error({ err: error, context: 'scheduler' }, 'Data retention cleanup error');
    throw error;
  }
}

/**
 * TASK 11: Send guardian verification reminder emails
 * Sends one reminder after 7 days if not yet verified
 */
async function sendGuardianReminders() {
  let sentCount = 0;
  
  try {
    // Find pending verifications older than 7 days that haven't received a reminder
    const pending = await db.execute(sql`
      SELECT id, user_id, guardian_contact_type, guardian_contact_value, verification_token
      FROM guardian_verifications
      WHERE verified_at IS NULL
        AND created_at <= NOW() - INTERVAL '7 days'
        AND reminder_sent_at IS NULL
        AND expires_at > NOW()
    `);
    
    for (const row of pending.rows) {
      try {
        await sendGuardianVerificationEmail({
          guardianEmail: row.guardian_contact_value,
          youthName: 'your child',
          verificationLink: `${getPublicUrl()}/guardian/verify/${row.verification_token}`,
        });
        
        // Mark reminder as sent
        await db.execute(sql`
          UPDATE guardian_verifications
          SET reminder_sent_at = NOW()
          WHERE id = ${row.id}
        `);
        
        sentCount++;
      } catch (err) {
        logger.error({ err, context: 'scheduler', reminderId: row.id }, 'Failed to send guardian reminder');
      }
    }
    
    if (sentCount > 0) {
      logger.info({ context: 'scheduler', sentCount }, 'Guardian reminder emails sent');
    }
  } catch (error) {
    logger.error({ err: error, context: 'scheduler' }, 'Guardian reminder error');
  }
  
  return sentCount;
}

/**
 * Check if current time matches 4:00 AM for auto-sunset
 */
function shouldRunAutoSunset() {
  const now = DateTime.now().setZone('America/Edmonton');
  return now.hour === 4 && now.minute >= 0 && now.minute < 5;
}

/**
 * Auto-sunset stale listings:
 * 1. Verified listings not re-verified in 90 days -> flag as stale
 * 2. Stale listings with 14-day grace period expired -> sunset (hide from Explore)
 */
async function runAutoSunset() {
  const results = { flaggedStale: 0, sunset: 0 };

  try {
    const staleDays = parseInt(process.env.STALE_LISTING_DAYS || '90', 10);
    const graceDays = parseInt(process.env.SUNSET_GRACE_DAYS || '14', 10);

    const staleThreshold = DateTime.now().minus({ days: staleDays }).toJSDate();
    const staleResult = await db.execute(sql`
      UPDATE programs
      SET stale_at = NOW(), verification_status = 'stale', updated_at = NOW()
      WHERE verification_status = 'verified'
        AND verified_at IS NOT NULL
        AND verified_at < ${staleThreshold}
        AND stale_at IS NULL
    `);
    results.flaggedStale = staleResult.rowCount || 0;

    const sunsetThreshold = DateTime.now().minus({ days: graceDays }).toJSDate();
    const sunsetResult = await db.execute(sql`
      UPDATE programs
      SET sunset_at = NOW(), verification_status = 'sunset', updated_at = NOW()
      WHERE verification_status = 'stale'
        AND stale_at IS NOT NULL
        AND stale_at < ${sunsetThreshold}
        AND sunset_at IS NULL
    `);
    results.sunset = sunsetResult.rowCount || 0;

    if (results.flaggedStale > 0 || results.sunset > 0) {
      logger.info({ context: 'scheduler', ...results }, 'Auto-sunset completed');
    }
  } catch (error) {
    logger.error({ err: error, context: 'scheduler' }, 'Auto-sunset error');
  }

  return results;
}

/**
 * Initialize the scheduler
 */
export function initializeScheduler() {
  if (schedulerInterval) {
    logger.info({ context: 'scheduler' }, 'Scheduler already initialized');
    return;
  }
  
  logger.info({ context: 'scheduler' }, 'Initializing scheduler...');
  
  // Calculate when the next snapshot should run
  const msUntilNext = msUntilNextSundaySnapshot();
  const nextRun = DateTime.now()
    .setZone('America/Edmonton')
    .plus({ milliseconds: msUntilNext });
    
  logger.info({ context: 'scheduler', nextRun: nextRun.toString() }, 'Next weekly snapshot scheduled');
  
  // Run the scheduler every 60 seconds to check if tasks need to run
  schedulerInterval = setInterval(runScheduledTasks, 60 * 1000); // Every minute
  
  // Run once on startup to check if we need to capture immediately
  runScheduledTasks();
  
  logger.info({ context: 'scheduler' }, 'Scheduler initialized successfully');
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info({ context: 'scheduler' }, 'Scheduler stopped');
  }
}

/**
 * Manually trigger weekly snapshots (for testing)
 */
export async function triggerWeeklySnapshots() {
  logger.info({ context: 'scheduler' }, 'Manually triggering weekly snapshots...');
  try {
    const result = await captureAllWeeklySnapshots();
    logger.info({ context: 'scheduler', result }, 'Manual weekly snapshots completed');
    return result;
  } catch (error) {
    logger.error({ err: error, context: 'scheduler' }, 'Failed to capture weekly snapshots');
    throw error;
  }
}