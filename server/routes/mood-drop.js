/**
 * Mood Drop API Routes
 * Handles moderated mood posts from users for community sharing
 */

import express from 'express';
import { db } from '../db.js';
import { moodDrops } from '../schema.js';
import { eq, desc } from 'drizzle-orm';
import Filter from 'bad-words';

const router = express.Router();
const profanityFilter = new Filter();

/**
 * POST /api/mood-drop
 * Create a moderated mood post
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { mood, message } = req.body;

    // Validate mood type
    const validMoods = ['cold', 'stormy', 'foggy', 'clear', 'breezy', 'aurora'];
    if (!mood || !validMoods.includes(mood)) {
      return res.status(400).json({ error: 'Invalid mood type' });
    }

    // Message is optional but if provided, moderate it
    let moderatedMessage = null;
    let isApproved = true;

    if (message && message.trim()) {
      // Check for profanity
      const hasProfanity = profanityFilter.isProfane(message);
      
      if (hasProfanity) {
        // Clean the message
        moderatedMessage = profanityFilter.clean(message);
        isApproved = false; // Require manual review
      } else {
        moderatedMessage = message.trim();
      }

      // Check message length (max 280 characters)
      if (moderatedMessage.length > 280) {
        return res.status(400).json({ error: 'Message too long (max 280 characters)' });
      }
    }

    // Create mood drop
    const [moodDrop] = await db.insert(moodDrops).values({
      userId,
      mood,
      message: moderatedMessage,
      isApproved,
      isPublic: isApproved, // Only approved drops are public
      createdAt: new Date()
    }).returning();

    res.json({
      id: moodDrop.id,
      mood: moodDrop.mood,
      message: moodDrop.message,
      isApproved: moodDrop.isApproved,
      needsReview: !isApproved,
      createdAt: moodDrop.createdAt
    });

  } catch (error) {
    console.error('Error creating mood drop:', error);
    res.status(500).json({ error: 'Failed to create mood drop' });
  }
});

/**
 * GET /api/mood-drop/public
 * Get public approved mood drops
 */
router.get('/public', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;

    const drops = await db.select({
      id: moodDrops.id,
      mood: moodDrops.mood,
      message: moodDrops.message,
      createdAt: moodDrops.createdAt
    })
    .from(moodDrops)
    .where(eq(moodDrops.isPublic, true))
    .orderBy(desc(moodDrops.createdAt))
    .limit(limit)
    .offset(offset);

    res.json({ drops, count: drops.length });

  } catch (error) {
    console.error('Error fetching public mood drops:', error);
    res.status(500).json({ error: 'Failed to fetch mood drops' });
  }
});

/**
 * GET /api/mood-drop/my
 * Get current user's mood drops
 */
router.get('/my', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const drops = await db.select()
      .from(moodDrops)
      .where(eq(moodDrops.userId, userId))
      .orderBy(desc(moodDrops.createdAt));

    res.json({ drops, count: drops.length });

  } catch (error) {
    console.error('Error fetching user mood drops:', error);
    res.status(500).json({ error: 'Failed to fetch mood drops' });
  }
});

export default router;
