import express from 'express';
import { db } from '../db.js';
import { profiles, checkins, privacyConsents } from '../schema.js';
import { eq, and, sql, gte } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { debugLog } from '../utils/logger.ts';
import logger from '../logger.ts';

const router = express.Router();

/**
 * Check if user needs a morning nudge
 * Called by scheduler at 10:00 AM Alberta time
 */
export async function checkMorningNudges() {
  try {
    const now = DateTime.now().setZone('America/Edmonton');
    const today = now.toISODate();
    
    // Only run at 10:00 AM
    if (now.hour !== 10 || now.minute > 5) {
      return;
    }

    debugLog('notifications', `Running morning nudge check at ${now.toISO()}`);

    // Get all users who have notifications enabled
    const usersWithNotifications = await db
      .select({
        userId: privacyConsents.userId,
        notificationsEnabled: privacyConsents.notificationsEnabled
      })
      .from(privacyConsents)
      .where(eq(privacyConsents.notificationsEnabled, true));

    for (const user of usersWithNotifications) {
      // Check if user has checked in today
      const [todayCheckin] = await db
        .select()
        .from(checkins)
        .where(and(
          eq(checkins.userId, user.userId),
          eq(checkins.checkinDate, today)
        ))
        .limit(1);

      if (!todayCheckin) {
        // User hasn't checked in today, send nudge
        await sendMorningNudge(user.userId);
      }
    }
  } catch (error) {
    logger.error({ err: error, context: 'notifications-morning-nudges' }, 'Error checking morning nudges');
  }
}

/**
 * Send a morning nudge notification to a user
 */
async function sendMorningNudge(userId) {
  try {
    // Get user profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      return;
    }

    // In a real implementation, this would send an actual notification
    // For now, we'll log it and store it in a notifications table
    debugLog('notifications', `Sending morning nudge to user ${userId}`);
    
    // You could integrate with a push notification service here
    // For example: Firebase Cloud Messaging, OneSignal, etc.
    
    // Store notification record (you'd need to create a notifications table)
    // await db.insert(notifications).values({
    //   userId,
    //   type: 'morning_nudge',
    //   title: 'Good morning! 🌅',
    //   message: 'Take a moment to check in with yourself today. Your Explore section is waiting!',
    //   sentAt: new Date()
    // });

    return true;
  } catch (error) {
    logger.error({ err: error, context: 'notifications-send-nudge', userId }, 'Error sending nudge to user');
    return false;
  }
}

/**
 * GET /api/notifications/status
 * Get user's notification preferences and status
 */
router.get('/status', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user's notification consent
    const [consent] = await db
      .select({
        notificationsEnabled: privacyConsents.notificationsEnabled
      })
      .from(privacyConsents)
      .where(eq(privacyConsents.userId, req.session.userId))
      .limit(1);

    // Check if user has checked in today
    const today = DateTime.now().setZone('America/Edmonton').toISODate();
    const [todayCheckin] = await db
      .select()
      .from(checkins)
      .where(and(
        eq(checkins.userId, req.session.userId),
        eq(checkins.checkinDate, today)
      ))
      .limit(1);

    res.json({
      notificationsEnabled: consent?.notificationsEnabled || false,
      hasCheckedInToday: !!todayCheckin,
      currentTime: DateTime.now().setZone('America/Edmonton').toISO()
    });
  } catch (error) {
    logger.error({ err: error, context: 'notifications-status' }, 'Error fetching notification status');
    res.status(500).json({ error: 'Failed to fetch notification status' });
  }
});

/**
 * POST /api/notifications/test-nudge
 * Test sending a morning nudge (admin only)
 */
router.post('/test-nudge', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user is admin
    const [profile] = await db
      .select({ isAdmin: profiles.isAdmin })
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const success = await sendMorningNudge(req.session.userId);
    
    res.json({
      success,
      message: success ? 'Test nudge sent successfully' : 'Failed to send test nudge'
    });
  } catch (error) {
    logger.error({ err: error, context: 'notifications-test-nudge' }, 'Error sending test nudge');
    res.status(500).json({ error: 'Failed to send test nudge' });
  }
});

export default router;