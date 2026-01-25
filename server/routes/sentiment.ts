import express from 'express';
import { db } from '../db.js';
import { sentimentAnalyses, profiles } from '../schema.ts';
import { eq, and, desc } from 'drizzle-orm';
import logger from '../logger.ts';

const router = express.Router();

async function hasAiConsent(userId: string): Promise<boolean> {
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return Boolean(profile?.ximiConsent);
}

// Get sentiment for a specific check-in (owned by current user)
router.get('/checkins/:checkinId', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const consent = await hasAiConsent(req.session.userId);
    if (!consent) {
      return res.status(403).json({ error: 'AI features not enabled. Enable Ximi in settings to view sentiment insights.' });
    }

    const { checkinId } = req.params;
    const [row] = await db.select()
      .from(sentimentAnalyses)
      .where(and(
        eq(sentimentAnalyses.userId, req.session.userId),
        eq(sentimentAnalyses.sourceType, 'checkin'),
        eq(sentimentAnalyses.sourceId, checkinId),
      ))
      .limit(1);

    if (!row) return res.status(404).json({ error: 'Not found' });
    return res.json(row);
  } catch (error) {
    logger.error({ err: error, context: 'sentiment-get-checkin' }, 'Get sentiment error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent sentiment analyses for current user
router.get('/recent', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const consent = await hasAiConsent(req.session.userId);
    if (!consent) {
      return res.status(403).json({ error: 'AI features not enabled. Enable Ximi in settings to view sentiment insights.' });
    }

    const limit = Math.min(Number(req.query.limit ?? 30) || 30, 100);
    const rows = await db.select()
      .from(sentimentAnalyses)
      .where(eq(sentimentAnalyses.userId, req.session.userId))
      .orderBy(desc(sentimentAnalyses.createdAt))
      .limit(limit);

    return res.json(rows);
  } catch (error) {
    logger.error({ err: error, context: 'sentiment-recent' }, 'Get sentiment recent error');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
