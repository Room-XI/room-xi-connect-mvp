import express from 'express';
import { db } from '../db.js';
import { consents, consentEvents } from '../schema.js';
import { eq, and } from 'drizzle-orm';

const router = express.Router();

// Get user's consents
router.get('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userConsents = await db.select().from(consents)
      .where(eq(consents.userId, req.session.userId));

    res.json(userConsents);
  } catch (error) {
    console.error('Get consents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update consent
router.post('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { consentType, value, grantedBy = 'self' } = req.body;

    if (!consentType || value === undefined) {
      return res.status(400).json({ error: 'consentType and value are required' });
    }

    const validTypes = [
      'terms_of_use', 'privacy_notice', 'data_collection',
      'photo_internal', 'photo_social_media', 'photo_website',
      'photo_fundraising', 'photo_story',
      'analytics_opt_in', 'ai_personalization', 'crash_reporting',
      'marketing_email', 'marketing_sms'
    ];

    if (!validTypes.includes(consentType)) {
      return res.status(400).json({ error: 'Invalid consent type' });
    }

    // Get IP and user agent
    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Find existing consent
    const [existing] = await db.select().from(consents)
      .where(and(
        eq(consents.userId, req.session.userId),
        eq(consents.consentType, consentType)
      ))
      .limit(1);

    let result;
    if (existing) {
      // Update
      [result] = await db.update(consents)
        .set({
          value,
          ipAddress,
          userAgent,
          grantedBy,
          updatedAt: new Date(),
        })
        .where(and(
          eq(consents.userId, req.session.userId),
          eq(consents.consentType, consentType)
        ))
        .returning();
    } else {
      // Insert
      [result] = await db.insert(consents)
        .values({
          userId: req.session.userId,
          consentType,
          value,
          ipAddress,
          userAgent,
          grantedBy,
        })
        .returning();
    }

    // Log consent event
    await db.insert(consentEvents).values({
      userId: req.session.userId,
      actor: grantedBy,
      eventType: value ? 'granted' : 'revoked',
      consentKey: consentType,
      oldValue: existing?.value || false,
      newValue: value,
      ipAddress,
      userAgent,
    });

    res.json(result);
  } catch (error) {
    console.error('Update consent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
