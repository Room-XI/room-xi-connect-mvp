import { DateTime } from 'luxon';
import { captureAllWeeklySnapshots } from '../routes/orbSnapshots.js';
import { checkMorningNudges } from '../routes/notifications.js';
import { sendCheckinReminder, pushEnabled } from './pushNotification.ts';
import { computeTrendsForAllUsers } from './moodTrends.ts';
import { computePeerInsightsForAllPrograms } from './peerInsights.ts';
import { db } from '../db.js';
import { privacyConsents, checkins, profiles, ximiConversations, guardianVerifications } from '../schema.js';
import { eq, and, lt, sql } from 'drizzle-orm';
import { sendGuardianVerificationEmail } from './email.js';

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
      console.log('[Scheduler] Push notifications disabled - skipping check-in reminders');
      return;
    }

    const now = DateTime.now().setZone('America/Edmonton');
    const today = now.toISODate();
    
    console.log(`[Scheduler] Sending check-in reminders at ${now.toISO()}`);

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
        console.error(`[Scheduler] Error sending reminder to user ${user.userId}:`, error);
      }
    }

    console.log(`[Scheduler] Check-in reminders sent: ${sentCount}, skipped: ${skippedCount}`);
  } catch (error) {
    console.error('[Scheduler] Error sending check-in reminders:', error);
  }
}

/**
 * Run scheduled tasks
 */
async function runScheduledTasks() {
  try {
    console.log('[Scheduler] Checking scheduled tasks at', 
      DateTime.now().setZone('America/Edmonton').toString());
    
    // Check if we should run weekly snapshot
    if (shouldRunWeeklySnapshot()) {
      console.log('[Scheduler] Running weekly orb snapshots...');
      
      try {
        const result = await captureAllWeeklySnapshots();
        console.log('[Scheduler] Weekly snapshots completed:', result);
      } catch (error) {
        console.error('[Scheduler] Failed to capture weekly snapshots:', error);
      }
    }
    
    // Check if we should send check-in reminders at 8:00 AM
    if (shouldRunCheckinReminder()) {
      console.log('[Scheduler] Sending check-in reminders...');
      
      try {
        await sendCheckinReminders();
        console.log('[Scheduler] Check-in reminders completed');
      } catch (error) {
        console.error('[Scheduler] Failed to send check-in reminders:', error);
      }
    }
    
    // Check if we should run morning nudges at 10:00 AM
    if (shouldRunMorningNudge()) {
      console.log('[Scheduler] Running morning nudge check...');
      
      try {
        await checkMorningNudges();
        console.log('[Scheduler] Morning nudge check completed');
      } catch (error) {
        console.error('[Scheduler] Failed to check morning nudges:', error);
      }
    }
    
    // Check if we should run trend computation at 9:00 AM on Mondays
    if (shouldRunTrendComputation()) {
      console.log('[Scheduler] Running mood trend computation for all users...');
      
      try {
        await computeTrendsForAllUsers();
        console.log('[Scheduler] Trend computation completed');
      } catch (error) {
        console.error('[Scheduler] Failed to compute trends:', error);
      }
    }
    
    // Check if we should run peer insights computation at 9:30 AM on Mondays
    if (shouldRunPeerInsights()) {
      console.log('[Scheduler] Running peer insights computation for all programs...');
      
      try {
        await computePeerInsightsForAllPrograms();
        console.log('[Scheduler] Peer insights computation completed');
      } catch (error) {
        console.error('[Scheduler] Failed to compute peer insights:', error);
      }
    }
    
    // Data retention cleanup at 3:00 AM daily
    if (shouldRunDataRetention()) {
      console.log('[Scheduler] Running data retention cleanup...');
      
      try {
        await runDataRetentionCleanup();
        console.log('[Scheduler] Data retention cleanup completed');
      } catch (error) {
        console.error('[Scheduler] Failed to run data retention cleanup:', error);
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error in scheduled tasks:', error);
  }
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
      WHERE verified_at IS NULL 
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
    const ximiDays = parseInt(process.env.RETENTION_XIMI_DAYS || '0', 10);
    if (ximiDays > 0) {
      const ximiResult = await db.execute(sql`
        DELETE FROM ximi_conversations
        WHERE created_at < NOW() - INTERVAL '1 day' * ${ximiDays}
      `);
      results.deletedXimiConversations = ximiResult.rowCount || 0;
    }
    
    // TASK 5: Optional cleanup of old check-ins
    const checkinDays = parseInt(process.env.RETENTION_CHECKINS_DAYS || '0', 10);
    if (checkinDays > 0) {
      const checkinResult = await db.execute(sql`
        DELETE FROM checkins
        WHERE timestamp < NOW() - INTERVAL '1 day' * ${checkinDays}
      `);
      results.deletedCheckins = checkinResult.rowCount || 0;
    }
    
    // TASK 11: Send guardian verification reminders after 7 days
    results.guardianReminders = await sendGuardianReminders();
    
    console.log('[DataRetention] Cleanup results:', results);
    return results;
  } catch (error) {
    console.error('[DataRetention] Cleanup error:', error);
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
          verificationLink: `${process.env.REPLIT_DEV_DOMAIN || 'http://localhost:5000'}/guardian/verify/${row.verification_token}`,
        });
        
        // Mark reminder as sent
        await db.execute(sql`
          UPDATE guardian_verifications
          SET reminder_sent_at = NOW()
          WHERE id = ${row.id}
        `);
        
        sentCount++;
      } catch (err) {
        console.error('[GuardianReminder] Failed to send reminder:', {
          id: row.id,
          error: err,
        });
      }
    }
    
    if (sentCount > 0) {
      console.log(`[GuardianReminder] Sent ${sentCount} reminder emails`);
    }
  } catch (error) {
    console.error('[GuardianReminder] Error:', error);
  }
  
  return sentCount;
}

/**
 * Initialize the scheduler
 */
export function initializeScheduler() {
  if (schedulerInterval) {
    console.log('[Scheduler] Scheduler already initialized');
    return;
  }
  
  console.log('[Scheduler] Initializing scheduler...');
  
  // Calculate when the next snapshot should run
  const msUntilNext = msUntilNextSundaySnapshot();
  const nextRun = DateTime.now()
    .setZone('America/Edmonton')
    .plus({ milliseconds: msUntilNext });
    
  console.log(`[Scheduler] Next weekly snapshot scheduled for: ${nextRun.toString()}`);
  
  // Run the scheduler every 60 seconds to check if tasks need to run
  schedulerInterval = setInterval(runScheduledTasks, 60 * 1000); // Every minute
  
  // Run once on startup to check if we need to capture immediately
  runScheduledTasks();
  
  console.log('[Scheduler] Scheduler initialized successfully');
}

/**
 * Stop the scheduler
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Scheduler] Scheduler stopped');
  }
}

/**
 * Manually trigger weekly snapshots (for testing)
 */
export async function triggerWeeklySnapshots() {
  console.log('[Scheduler] Manually triggering weekly snapshots...');
  try {
    const result = await captureAllWeeklySnapshots();
    console.log('[Scheduler] Manual weekly snapshots completed:', result);
    return result;
  } catch (error) {
    console.error('[Scheduler] Failed to capture weekly snapshots:', error);
    throw error;
  }
}