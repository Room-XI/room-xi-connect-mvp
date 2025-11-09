import express from 'express';
import { db } from '../db.js';
import { pushSubscriptions, profiles } from '../schema.js';
import { eq, and } from 'drizzle-orm';
import { pushEnabled } from '../services/pushNotification.ts';

const router = express.Router();

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';

router.get('/vapid-public-key', (req, res) => {
  if (!pushEnabled) {
    return res.status(503).json({ 
      error: 'Push notifications not configured',
      message: 'VAPID keys are not configured. Push notifications are disabled.'
    });
  }
  
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

router.post('/subscribe', async (req, res) => {
  try {
    if (!pushEnabled) {
      return res.status(503).json({ 
        error: 'Push notifications not configured',
        message: 'Push notifications are currently disabled. Please configure VAPID keys to enable this feature.'
      });
    }

    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    const existingSubscription = await db
      .select()
      .from(pushSubscriptions)
      .where(and(
        eq(pushSubscriptions.userId, req.session.userId),
        eq(pushSubscriptions.endpoint, endpoint)
      ))
      .limit(1);

    if (existingSubscription.length > 0) {
      await db
        .update(pushSubscriptions)
        .set({
          p256dh: keys.p256dh,
          auth: keys.auth,
          updatedAt: new Date(),
        })
        .where(eq(pushSubscriptions.id, existingSubscription[0].id));
    } else {
      await db.insert(pushSubscriptions).values({
        userId: req.session.userId,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
      });
    }

    res.json({ success: true, message: 'Subscription saved' });
  } catch (error) {
    console.error('[Push] Error subscribing:', error);
    res.status(500).json({ error: 'Failed to save subscription' });
  }
});

router.delete('/unsubscribe', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { endpoint } = req.body;

    if (!endpoint) {
      await db
        .delete(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, req.session.userId));
    } else {
      await db
        .delete(pushSubscriptions)
        .where(and(
          eq(pushSubscriptions.userId, req.session.userId),
          eq(pushSubscriptions.endpoint, endpoint)
        ));
    }

    res.json({ success: true, message: 'Subscription removed' });
  } catch (error) {
    console.error('[Push] Error unsubscribing:', error);
    res.status(500).json({ error: 'Failed to remove subscription' });
  }
});

router.get('/status', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, req.session.userId));

    res.json({
      subscribed: subscriptions.length > 0,
      subscriptionCount: subscriptions.length,
      configured: !!VAPID_PUBLIC_KEY,
    });
  } catch (error) {
    console.error('[Push] Error getting status:', error);
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

router.post('/send', async (req, res) => {
  try {
    if (!pushEnabled) {
      return res.status(503).json({ 
        error: 'Push notifications not configured',
        message: 'Push notifications are currently disabled. Please configure VAPID keys to enable this feature.'
      });
    }

    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [profile] = await db
      .select({ isAdmin: profiles.isAdmin })
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId, title, body, url, tag } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { sendPushNotification } = await import('../services/pushNotification.ts');
    
    const result = await sendPushNotification(userId, {
      title,
      body,
      url,
      tag,
    });

    res.json({ success: true, sent: result.sent, failed: result.failed });
  } catch (error) {
    console.error('[Push] Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

router.post('/test', async (req, res) => {
  try {
    if (!pushEnabled) {
      return res.status(503).json({ 
        error: 'Push notifications not configured',
        message: 'Push notifications are currently disabled. Please configure VAPID keys to enable this feature.'
      });
    }

    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { sendPushNotification } = await import('../services/pushNotification.ts');
    
    const result = await sendPushNotification(req.session.userId, {
      title: 'Room XI Connect',
      body: 'This is a test notification from Room XI Connect!',
      icon: '/icons/icon-192.png',
      tag: 'test',
    });

    res.json({ 
      success: true, 
      sent: result.sent, 
      failed: result.failed,
      message: `Sent to ${result.sent} device(s)`,
    });
  } catch (error) {
    console.error('[Push] Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

export default router;
