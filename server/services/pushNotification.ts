import webpush from 'web-push';
import { db } from '../db.js';
import { pushSubscriptions, profiles, programs } from '../schema.js';
import { eq } from 'drizzle-orm';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:support@roomxiconnect.org';

export const pushEnabled = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (pushEnabled) {
  webpush.setVapidDetails(
    VAPID_EMAIL,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('[Push Service] Push notifications enabled - VAPID keys configured');
} else {
  console.warn('[Push Service] Push notifications disabled - VAPID keys not configured');
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  requireInteraction?: boolean;
  actions?: Array<{ action: string; title: string; icon?: string }>;
}

interface SendResult {
  sent: number;
  failed: number;
  errors: Array<{ endpoint: string; error: string }>;
}

export async function sendPushNotification(
  userId: string,
  payload: PushPayload
): Promise<SendResult> {
  const result: SendResult = {
    sent: 0,
    failed: 0,
    errors: [],
  };

  if (!pushEnabled) {
    return result;
  }

  try {

    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));

    if (subscriptions.length === 0) {
      console.log(`[Push Service] No subscriptions found for user ${userId}`);
      return result;
    }

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-192.png',
      tag: payload.tag || 'general',
      url: payload.url || '/',
      requireInteraction: payload.requireInteraction || false,
      actions: payload.actions || [],
    });

    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          notificationPayload
        );
        result.sent++;
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          endpoint: subscription.endpoint,
          error: error.message,
        });

        if (error.statusCode === 410) {
          console.log(`[Push Service] Subscription expired, removing: ${subscription.endpoint}`);
          await db
            .delete(pushSubscriptions)
            .where(eq(pushSubscriptions.id, subscription.id));
        }
      }
    });

    await Promise.all(sendPromises);

    console.log(`[Push Service] Sent ${result.sent} notifications, ${result.failed} failed`);
    return result;
  } catch (error) {
    console.error('[Push Service] Error sending push notification:', error);
    return result;
  }
}

export async function sendBulkNotifications(
  userIds: string[],
  payload: PushPayload
): Promise<SendResult> {
  const aggregateResult: SendResult = {
    sent: 0,
    failed: 0,
    errors: [],
  };

  if (!pushEnabled) {
    return aggregateResult;
  }

  for (const userId of userIds) {
    const result = await sendPushNotification(userId, payload);
    aggregateResult.sent += result.sent;
    aggregateResult.failed += result.failed;
    aggregateResult.errors.push(...result.errors);
  }

  return aggregateResult;
}

export async function sendCheckinReminder(userId: string): Promise<SendResult> {
  if (!pushEnabled) {
    return { sent: 0, failed: 0, errors: [] };
  }

  try {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    const preferredName = profile?.preferredName || profile?.firstName || 'there';

    return await sendPushNotification(userId, {
      title: '🌅 Good morning!',
      body: `Hey ${preferredName}, take a moment to check in with yourself today.`,
      tag: 'checkin-reminder',
      url: '/',
      requireInteraction: false,
    });
  } catch (error) {
    console.error('[Push Service] Error sending check-in reminder:', error);
    return { sent: 0, failed: 0, errors: [] };
  }
}

export async function sendEventReminder(
  userId: string,
  programId: string
): Promise<SendResult> {
  if (!pushEnabled) {
    return { sent: 0, failed: 0, errors: [] };
  }

  try {
    const [program] = await db
      .select()
      .from(programs)
      .where(eq(programs.id, programId))
      .limit(1);

    if (!program) {
      console.warn(`[Push Service] Program ${programId} not found`);
      return { sent: 0, failed: 0, errors: [] };
    }

    return await sendPushNotification(userId, {
      title: '📅 Event Reminder',
      body: `${program.title} starts in 1 hour!`,
      tag: `event-${programId}`,
      url: `/program/${programId}`,
      requireInteraction: true,
    });
  } catch (error) {
    console.error('[Push Service] Error sending event reminder:', error);
    return { sent: 0, failed: 0, errors: [] };
  }
}

export async function sendMoodDropAlert(userId: string): Promise<SendResult> {
  if (!pushEnabled) {
    return { sent: 0, failed: 0, errors: [] };
  }

  try {
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    const preferredName = profile?.preferredName || profile?.firstName || 'there';

    return await sendPushNotification(userId, {
      title: '💙 We noticed a change',
      body: `Hey ${preferredName}, it looks like you've been feeling down lately. We're here to support you.`,
      tag: 'mood-drop',
      url: '/crisis',
      requireInteraction: true,
      actions: [
        { action: 'view-resources', title: 'View Resources' },
        { action: 'dismiss', title: 'Not now' },
      ],
    });
  } catch (error) {
    console.error('[Push Service] Error sending mood drop alert:', error);
    return { sent: 0, failed: 0, errors: [] };
  }
}

export async function sendStreakCelebration(
  userId: string,
  streakDays: number
): Promise<SendResult> {
  if (!pushEnabled) {
    return { sent: 0, failed: 0, errors: [] };
  }

  try {
    const milestones = [3, 7, 14, 30, 60, 100];
    if (!milestones.includes(streakDays)) {
      return { sent: 0, failed: 0, errors: [] };
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    const preferredName = profile?.preferredName || profile?.firstName || 'there';

    let emoji = '🎉';
    if (streakDays >= 30) emoji = '🔥';
    if (streakDays >= 100) emoji = '⭐';

    return await sendPushNotification(userId, {
      title: `${emoji} ${streakDays}-Day Streak!`,
      body: `Amazing work, ${preferredName}! You've checked in for ${streakDays} days in a row!`,
      tag: `streak-${streakDays}`,
      url: '/me',
      requireInteraction: false,
    });
  } catch (error) {
    console.error('[Push Service] Error sending streak celebration:', error);
    return { sent: 0, failed: 0, errors: [] };
  }
}
