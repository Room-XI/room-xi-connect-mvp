/// <reference path="../types/session.d.ts" />

import express from 'express';
import { db } from '../db.js';
import { ximiConversations, profiles, checkins } from '../schema.js';
import { eq } from 'drizzle-orm';
import { generateXimiResponse, generateFollowUpPrompt, type XimiMode } from '../services/ximi.js';
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

    // Check if user has consented to Ximi
    if (!profile?.ximiConsent) {
      return res.status(403).json({ 
        error: 'Ximi consent required',
        message: 'You need to accept Ximi AI terms before chatting.' 
      });
    }

    const mode: XimiMode = (profile.ximiMode as XimiMode) || 'sibling';

    // Generate Ximi response
    const ximiResponse = await generateXimiResponse(message, {
      moodType: moodType as MoodKey,
      wellnessDimensions,
      mode,
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
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { consent } = req.body;

    if (typeof consent !== 'boolean') {
      return res.status(400).json({ error: 'consent must be a boolean' });
    }

    await db
      .update(profiles)
      .set({ ximiConsent: consent })
      .where(eq(profiles.userId, req.session.userId));

    res.json({ 
      ximiConsent: consent, 
      message: consent ? 'Ximi AI enabled' : 'Ximi AI disabled' 
    });
  } catch (error) {
    console.error('Update consent error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
