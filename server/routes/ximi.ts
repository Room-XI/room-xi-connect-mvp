/// <reference path="../types/session.d.ts" />

import express from 'express';
import { db } from '../db.js';
import { ximiConversations, profiles, checkins } from '../schema.js';
import { eq } from 'drizzle-orm';
import { generateXimiResponse, generateFollowUpPrompt, type XimiMode } from '../services/ximi.js';
import { getLatestMoodTrend, computeMoodTrends, storeMoodTrends } from '../services/moodTrends.js';
import { getRecommendationsWithContext } from '../services/recommendations.js';
import type { MoodKey } from '../../src/lib/moodConfig.js';

const router = express.Router();

// Get conversation history for user
router.get('/conversations', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const conversations = await db
      .select()
      .from(ximiConversations)
      .where(eq(ximiConversations.userId, req.session.userId))
      .orderBy(ximiConversations.createdAt)
      .limit(50);

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Chat with Ximi
router.post('/chat', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { message, checkinId, moodType, wellnessDimensions } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: 'Message too long: maximum 500 characters' });
    }

    // Get user's Ximi preferences from profile
    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    console.log('[Ximi AI] Chat request - checking consent:', {
      userId: req.session.userId,
      profileExists: !!profile,
      ximiConsent: profile?.ximiConsent,
      ximiMode: profile?.ximiMode,
      timestamp: new Date().toISOString(),
    });

    // Check if user has consented to Ximi
    if (!profile?.ximiConsent) {
      console.log('[Ximi AI] Chat blocked: consent not granted');
      return res.status(403).json({ 
        error: 'Ximi consent required',
        message: 'You need to accept Ximi AI terms before chatting.' 
      });
    }

    console.log('[Ximi AI] Consent verified, processing chat request');

    const mode: XimiMode = (profile.ximiMode as XimiMode) || 'sibling';

    // Get mood trend for context
    const moodTrend = await getLatestMoodTrend(req.session.userId, 'week');

    // Get program recommendations if trend data is available
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

    // Generate Ximi response with trend and recommendation context
    const ximiResponse = await generateXimiResponse(message, {
      moodType: moodType as MoodKey,
      wellnessDimensions,
      mode,
      moodTrend,
      recommendations: recommendations.slice(0, 3),
    });

    // Save conversation to database
    const [conversation] = await db
      .insert(ximiConversations)
      .values({
        userId: req.session.userId,
        checkinId: checkinId || null,
        mode,
        userMessage: message.trim(),
        ximiResponse: ximiResponse.message,
        moodContext: moodType || null,
        dimensionsContext: wellnessDimensions || [],
        crisisDetected: ximiResponse.crisisDetected,
        crisisKeywords: ximiResponse.crisisKeywords,
      })
      .returning();

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

// Generate follow-up prompt after check-in
router.post('/follow-up', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { checkinId } = req.body;

    if (!checkinId) {
      return res.status(400).json({ error: 'checkinId is required' });
    }

    // Get the check-in details
    const [checkin] = await db
      .select()
      .from(checkins)
      .where(eq(checkins.id, checkinId))
      .limit(1);

    if (!checkin || checkin.userId !== req.session.userId) {
      return res.status(404).json({ error: 'Check-in not found' });
    }

    // Get user's Ximi preferences
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

    const mode: XimiMode = (profile.ximiMode as XimiMode) || 'sibling';

    // Generate follow-up prompt
    const prompt = await generateFollowUpPrompt(
      checkin.moodType as MoodKey,
      checkin.wellnessDimensions || [],
      checkin.note,
      mode
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

// Toggle Ximi mode (Little Sibling ↔ Peer Guide)
router.post('/toggle-mode', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { mode } = req.body;

    if (!mode || !['sibling', 'peer'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Must be "sibling" or "peer"' });
    }

    await db
      .update(profiles)
      .set({ ximiMode: mode })
      .where(eq(profiles.userId, req.session.userId));

    res.json({ mode, message: `Ximi mode changed to ${mode === 'sibling' ? 'Little Sibling' : 'Peer Guide'}` });
  } catch (error) {
    console.error('Toggle mode error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Grant/revoke Ximi consent
router.post('/consent', async (req, res) => {
  try {
    if (!req.session.userId) {
      console.log('[Ximi AI] Consent update failed: not authenticated');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { consent } = req.body;

    if (typeof consent !== 'boolean') {
      console.log('[Ximi AI] Consent update failed: invalid consent type:', typeof consent);
      return res.status(400).json({ error: 'consent must be a boolean' });
    }

    console.log('[Ximi AI] Updating consent for user:', {
      userId: req.session.userId,
      consent,
      timestamp: new Date().toISOString(),
    });

    // Use UPSERT to create profile if it doesn't exist
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

    console.log('[Ximi AI] Consent updated successfully:', {
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

// Get user's mood trends
router.get('/trends', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const windowType = (req.query.windowType as string) || 'week';

    if (!['week', 'month', 'quarter'].includes(windowType)) {
      return res.status(400).json({ error: 'Invalid windowType. Must be "week", "month", or "quarter"' });
    }

    console.log(`[Ximi AI] Fetching ${windowType} trends for user ${req.session.userId}`);

    // Try to get latest trend from database
    let trend = await getLatestMoodTrend(req.session.userId, windowType as 'week' | 'month' | 'quarter');

    // If no trend exists or it's stale, compute new trend
    if (!trend) {
      console.log('[Ximi AI] No existing trend found, computing new trend...');
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

// Get personalized program recommendations
router.post('/recommendations', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { currentMood, wellnessDimensions, includetrends, userLat, userLng, prioritizeNearby } = req.body;

    console.log('[Ximi AI] Generating recommendations for user', req.session.userId, {
      hasLocation: !!(userLat && userLng),
      prioritizeNearby: prioritizeNearby || false,
    });

    // Get mood trend if requested
    let moodTrend: any = null;
    if (includetrends !== false) {
      moodTrend = await getLatestMoodTrend(req.session.userId, 'week');
    }

    // Generate recommendations
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
