import express from 'express';
import { db } from '../db.js';
import { checkins, profiles } from '../schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { calculateStreak, getLocalDateString } from '../services/streak.ts';

const router = express.Router();

// Get checkins for user
router.get('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userCheckins = await db.select().from(checkins)
      .where(eq(checkins.userId, req.session.userId))
      .orderBy(sql`${checkins.timestamp} DESC`);

    res.json(userCheckins);
  } catch (error) {
    console.error('Get checkins error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update checkin
router.post('/', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { timestamp, dimension, moodLevel16, moodType, wellnessDimensions, affectTags, note, localTz } = req.body;

    // Validate inputs
    if (!dimension || !moodLevel16) {
      return res.status(400).json({ error: 'dimension and moodLevel16 are required' });
    }

    if (moodLevel16 < 1 || moodLevel16 > 6) {
      return res.status(400).json({ error: 'moodLevel16 must be between 1 and 6' });
    }

    if (!['mood', 'energy', 'anxiety', 'focus'].includes(dimension)) {
      return res.status(400).json({ error: 'Invalid dimension' });
    }

    if (note && note.length > 140) {
      return res.status(400).json({ error: 'Note too long: maximum 140 characters' });
    }

    const checkinTimestamp = timestamp ? new Date(timestamp) : new Date();
    
    // Get user timezone from profile (fallback to local timezone or Edmonton)
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, req.session.userId)).limit(1);
    const userTimezone = profile?.timezone || localTz || 'America/Edmonton';
    
    // Use Luxon-based date string calculation
    const dateStr = getLocalDateString(checkinTimestamp.toISOString(), userTimezone);

    // Check for existing checkin on same date
    const existingCheckins = await db.select().from(checkins)
      .where(
        and(
          eq(checkins.userId, req.session.userId),
          eq(checkins.checkinDate, dateStr)
        )
      );

    let result;
    if (existingCheckins.length > 0) {
      // Update existing
      [result] = await db.update(checkins)
        .set({
          timestamp: checkinTimestamp,
          checkinDate: dateStr,
          dimension,
          moodLevel16,
          moodType: moodType || null,
          wellnessDimensions: wellnessDimensions || [],
          affectTags: affectTags || [],
          note: note || null,
          localTz: localTz || null,
        })
        .where(eq(checkins.id, existingCheckins[0].id))
        .returning();
    } else {
      // Create new
      [result] = await db.insert(checkins)
        .values({
          userId: req.session.userId,
          timestamp: checkinTimestamp,
          checkinDate: dateStr,
          dimension,
          moodLevel16,
          moodType: moodType || null,
          wellnessDimensions: wellnessDimensions || [],
          affectTags: affectTags || [],
          note: note || null,
          localTz: localTz || null,
        })
        .returning();
    }

    // Update profile streak using DST-safe Luxon calculation
    if (profile) {
      const streakResult = calculateStreak(
        profile.lastCheckinDate,
        profile.streakCount || 0,
        userTimezone,
        checkinTimestamp
      );

      await db.update(profiles)
        .set({
          lastCheckinDate: dateStr,
          streakCount: streakResult.newStreak,
        })
        .where(eq(profiles.userId, req.session.userId));
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Create checkin error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
