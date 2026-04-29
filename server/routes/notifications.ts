import express from 'express';
import type { Request, Response } from 'express';
import { db } from '../db.js';
import { profiles, checkins, privacyConsents, notifications } from '../schema.js';
import { eq, and, sql, gte, desc, inArray } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { debugLog } from '../utils/logger.ts';
import logger from '../logger.ts';

const router = express.Router();

export async function checkMorningNudges(): Promise<void> {
  try {
    const now = DateTime.now().setZone('America/Edmonton');
    const today = now.toISODate();
    
    if (now.hour !== 10 || now.minute > 5) {
      return;
    }

    debugLog('notifications', `Running morning nudge check at ${now.toISO()}`);

    const usersWithNotifications = await db
      .select({
        userId: privacyConsents.userId,
        notificationsEnabled: privacyConsents.notificationsEnabled
      })
      .from(privacyConsents)
      .where(eq(privacyConsents.notificationsEnabled, true));

    for (const user of usersWithNotifications) {
      const [todayCheckin] = await db
        .select()
        .from(checkins)
        .where(and(
          eq(checkins.userId, user.userId),
          eq(checkins.checkinDate, today as string)
        ))
        .limit(1);

      if (!todayCheckin) {
        await sendMorningNudge(user.userId);
      }
    }
  } catch (error) {
    logger.error({ err: error, context: 'notifications-morning-nudges' }, 'Error checking morning nudges');
  }
}

async function sendMorningNudge(userId: string): Promise<boolean> {
  try {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      return false;
    }

    debugLog('notifications', `Sending morning nudge to user ${userId}`);

    return true;
  } catch (error) {
    logger.error({ err: error, context: 'notifications-send-nudge', userId }, 'Error sending nudge to user');
    return false;
  }
}

router.get('/status', async (req: Request, res: Response) => {
  try {
    if (!(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [consent] = await db
      .select({
        notificationsEnabled: privacyConsents.notificationsEnabled
      })
      .from(privacyConsents)
      .where(eq(privacyConsents.userId, (req.session as any).userId))
      .limit(1);

    const today = DateTime.now().setZone('America/Edmonton').toISODate();
    const [todayCheckin] = await db
      .select()
      .from(checkins)
      .where(and(
        eq(checkins.userId, (req.session as any).userId),
        eq(checkins.checkinDate, today as string)
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

router.post('/test-nudge', async (req: Request, res: Response) => {
  try {
    if (!(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [profile] = await db
      .select({ isAdmin: profiles.isAdmin })
      .from(profiles)
      .where(eq(profiles.userId, (req.session as any).userId))
      .limit(1);

    if (!(profile as any)?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const success = await sendMorningNudge((req.session as any).userId);
    
    res.json({
      success,
      message: success ? 'Test nudge sent successfully' : 'Failed to send test nudge'
    });
  } catch (error) {
    logger.error({ err: error, context: 'notifications-test-nudge' }, 'Error sending test nudge');
    res.status(500).json({ error: 'Failed to send test nudge' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    if (!(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;
    
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, (req.session as any).userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
    
    const [unreadCount] = await db
      .select({ count: sql`count(*)::int` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, (req.session as any).userId),
        sql`${notifications.readAt} IS NULL`
      ));
    
    res.json({
      notifications: userNotifications,
      unreadCount: (unreadCount as any)?.count || 0,
    });
  } catch (error) {
    logger.error({ err: error, context: 'notifications-list' }, 'Error listing notifications');
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.post('/mark-read', async (req: Request, res: Response) => {
  try {
    if (!(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { notificationIds } = req.body;
    
    if (notificationIds && Array.isArray(notificationIds) && notificationIds.length > 0) {
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(
          eq(notifications.userId, (req.session as any).userId),
          inArray(notifications.id, notificationIds)
        ));
    } else {
      await db
        .update(notifications)
        .set({ readAt: new Date() })
        .where(and(
          eq(notifications.userId, (req.session as any).userId),
          sql`${notifications.readAt} IS NULL`
        ));
    }
    
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error, context: 'notifications-mark-read' }, 'Error marking notifications read');
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

export default router;
