/// <reference path="../types/session.d.ts" />

import express from 'express';
import { db } from '../db.ts';
import { ximiConversations, profiles, checkins } from '../schema.ts';
import { eq, desc, sql } from 'drizzle-orm';
import { generateXimiResponse, generateFollowUpPrompt } from '../services/ximi.ts';
import { getLatestMoodTrend, computeMoodTrends, storeMoodTrends } from '../services/moodTrends.ts';
import { getRecommendationsWithContext } from '../services/recommendations.ts';
import { recordAiMetrics } from '../services/aiTransparency.ts';
import type { MoodKey } from '../../src/lib/moodConfig.js';
import { validateBody } from '../middleware/validate.ts';
import { ximiChatSchema, ximiConsentSchema, ximiRecommendationsSchema } from '../schemas/ximi.ts';
import { debugLog } from '../utils/logger.ts';
import { requireDataConsent } from '../middleware/consent.ts';

const router = express.Router();

router.get('/conversations', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const offset = parseInt(req.query.offset as string) || 0;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(ximiConversations)
      .where(eq(ximiConversations.userId, req.session.userId));

    const totalCount = countResult?.count || 0;

    const conversations = await db
      .select()
      .from(ximiConversations)
      .where(eq(ximiConversations.userId, req.session.userId))
      .orderBy(desc(ximiConversations.createdAt))
      .limit(limit)
      .offset(offset);

    const orderedConversations = conversations.reverse();

    res.json({
      conversations: orderedConversations,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/chat', requireDataConsent(), validateBody(ximiChatSchema), async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { message, checkinId, moodType, wellnessDimensions } = req.body;

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    debugLog('Ximi AI', 'Chat request - checking consent:', {
      userId: req.session.userId,
      profileExists: !!profile,
      ximiConsent: profile?.ximiConsent,
      timestamp: new Date().toISOString(),
    });

    if (!profile?.ximiConsent) {
      debugLog('Ximi AI', 'Chat blocked: consent not granted');
      return res.status(403).json({ 
        error: 'Ximi consent required',
        message: 'You need to accept Ximi AI terms before chatting.' 
      });
    }

    debugLog('Ximi AI', 'Consent verified, processing chat request');

    const moodTrend = await getLatestMoodTrend(req.session.userId, 'week');

    let recommendations: any[] = [];
    if (moodTrend) {
      recommendations = await getRecommendationsWithContext(
        req.session.userId,
        moodType as MoodKey,
        wellnessDimensions,
        moodTrend,
        undefined,
        undefined,
        false
      );
    }

    const ximiResponse = await generateXimiResponse(message, {
      moodType: moodType as MoodKey,
      wellnessDimensions,
      moodTrend,
      recommendations: recommendations.slice(0, 3),
    });

    const [conversation] = await db
      .insert(ximiConversations)
      .values({
        userId: req.session.userId,
        checkinId: checkinId || null,
        mode: 'unified',
        userMessage: message.trim(),
        ximiResponse: ximiResponse.message,
        moodContext: moodType || null,
        dimensionsContext: wellnessDimensions || [],
        crisisDetected: ximiResponse.crisisDetected,
        crisisKeywords: ximiResponse.crisisKeywords,
      })
      .returning();

    await recordAiMetrics({
      totalMessagesDelta: 1,
      crisisDetectedDelta: ximiResponse.crisisDetected ? 1 : 0,
      moderationFlaggedDelta: 0,
    });

    res.json({
      ...conversation,
      crisisDetected: ximiResponse.crisisDetected,
      trendContext: moodTrend,
      recommendationsIncluded: recommendations.length > 0,
    });
  } catch (error) {
    console.error('Ximi chat error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/follow-up', requireDataConsent(), async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { checkinId } = req.body;

    if (!checkinId) {
      return res.status(400).json({ error: 'checkinId is required' });
    }

    const [checkin] = await db
      .select()
      .from(checkins)
      .where(eq(checkins.id, checkinId))
      .limit(1);

    if (!checkin || checkin.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Check-in not found' });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    if (!profile?.ximiConsent) {
      return res.status(403).json({ 
        error: 'Ximi consent required' 
      });
    }

    const prompt = await generateFollowUpPrompt(
      checkin.moodType as MoodKey,
      checkin.wellnessDimensions || [],
      checkin.note
    );

    res.json({
      prompt,
      moodType: checkin.moodType,
      wellnessDimensions: checkin.wellnessDimensions,
    });
  } catch (error) {
    console.error('Generate follow-up error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/consent', async (req, res) => {
  try {
    if (!req.session.userId) {
      debugLog('Ximi AI', 'Consent update failed: not authenticated');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { consent } = req.body;

    if (typeof consent !== 'boolean') {
      debugLog('Ximi AI', 'Consent update failed: invalid consent type:', typeof consent);
      return res.status(400).json({ error: 'consent must be a boolean' });
    }

    debugLog('Ximi AI', 'Updating consent for user:', {
      userId: req.session.userId,
      consent,
      timestamp: new Date().toISOString(),
    });

    await db
      .insert(profiles)
      .values({
        userId: req.session.userId,
        ximiConsent: consent,
      })
      .onConflictDoUpdate({
        target: profiles.userId,
        set: { ximiConsent: consent }
      });

    debugLog('Ximi AI', 'Consent updated successfully:', {
      userId: req.session.userId,
      ximiConsent: consent,
      timestamp: new Date().toISOString(),
    });

    res.json({ 
      ximiConsent: consent, 
      message: consent ? 'Ximi AI enabled' : 'Ximi AI disabled' 
    });
  } catch (error) {
    console.error('[Ximi AI] Update consent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/trends', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const windowType = (req.query.windowType as string) || 'week';

    if (!['week', 'month', 'quarter'].includes(windowType)) {
      return res.status(400).json({ error: 'Invalid windowType. Must be "week", "month", or "quarter"' });
    }

    debugLog('Ximi AI', `Fetching ${windowType} trends for user ${req.session.userId}`);

    let trend = await getLatestMoodTrend(req.session.userId, windowType as 'week' | 'month' | 'quarter');

    if (!trend) {
      debugLog('Ximi AI', 'No existing trend found, computing new trend...');
      const trendData = await computeMoodTrends(req.session.userId, windowType as 'week' | 'month' | 'quarter');
      
      if (trendData) {
        await storeMoodTrends(trendData);
        trend = trendData;
      }
    }

    if (!trend) {
      return res.status(404).json({ 
        error: 'No trend data available',
        message: 'Not enough check-in data to compute trends' 
      });
    }

    res.json(trend);
  } catch (error) {
    console.error('[Ximi AI] Get trends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/recommendations', requireDataConsent(), async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentMood, wellnessDimensions, includetrends, userLat, userLng, prioritizeNearby } = req.body;

    debugLog('Ximi AI', 'Generating recommendations for user', req.session.userId, {
      hasLocation: !!(userLat && userLng),
      prioritizeNearby: prioritizeNearby || false,
    });

    let moodTrend: any = null;
    if (includetrends !== false) {
      moodTrend = await getLatestMoodTrend(req.session.userId, 'week');
    }

    const recommendations = await getRecommendationsWithContext(
      req.session.userId,
      currentMood as MoodKey,
      wellnessDimensions,
      moodTrend,
      userLat,
      userLng,
      prioritizeNearby
    );

    res.json({
      recommendations,
      trendContext: moodTrend,
      count: recommendations.length,
    });
  } catch (error) {
    console.error('[Ximi AI] Get recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
