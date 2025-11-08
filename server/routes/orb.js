/**
 * Orb API Routes
 * Handles mood orb summary and related endpoints
 */

import express from 'express';
import { db } from '../db.js';
import { checkins } from '../schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';
import { applyLaplaceNoise } from '../lib/differentialPrivacy.js';
import { DateTime } from 'luxon';

const router = express.Router();

/**
 * GET /api/orb/summary
 * Returns 7-day mood summary with ratios, streak, dominant mood, and variance
 */
router.get('/summary', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Get check-ins from last 7 days
    const sevenDaysAgo = DateTime.now().setZone('America/Edmonton').minus({ days: 7 }).toJSDate();
    
    const recentCheckins = await db.select()
      .from(checkins)
      .where(and(
        eq(checkins.userId, userId),
        gte(checkins.createdAt, sevenDaysAgo)
      ))
      .orderBy(checkins.createdAt);

    // Count moods
    const moodCounts = {
      cold: 0,
      stormy: 0,
      foggy: 0,
      clear: 0,
      breezy: 0,
      aurora: 0
    };

    recentCheckins.forEach(checkin => {
      if (checkin.mood && moodCounts.hasOwnProperty(checkin.mood)) {
        moodCounts[checkin.mood]++;
      }
    });

    // Calculate ratios (count / 7)
    const ratios = {};
    Object.keys(moodCounts).forEach(mood => {
      ratios[mood] = moodCounts[mood] / 7;
    });

    // Find dominant mood
    const dominantMood = Object.entries(moodCounts)
      .reduce((a, b) => (b[1] > a[1] ? b : a))[0];

    // Calculate variance (standard deviation of mood frequencies)
    const counts = Object.values(moodCounts);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length;

    // Calculate current streak
    const allCheckins = await db.select()
      .from(checkins)
      .where(eq(checkins.userId, userId))
      .orderBy(sql`${checkins.createdAt} DESC`);

    let streak = 0;
    let currentDate = DateTime.now().setZone('America/Edmonton').startOf('day');
    
    for (const checkin of allCheckins) {
      const checkinDate = DateTime.fromJSDate(checkin.createdAt).setZone('America/Edmonton').startOf('day');
      const daysDiff = currentDate.diff(checkinDate, 'days').days;
      
      if (daysDiff === 0) {
        streak++;
        currentDate = currentDate.minus({ days: 1 });
      } else if (daysDiff === 1) {
        streak++;
        currentDate = checkinDate.minus({ days: 1 });
      } else {
        break;
      }
    }

    // Apply differential privacy noise to ratios
    const noisyRatios = {};
    Object.keys(ratios).forEach(mood => {
      noisyRatios[mood] = Math.max(0, Math.min(1, applyLaplaceNoise(ratios[mood])));
    });

    res.json({
      ratios: noisyRatios,
      streak: applyLaplaceNoise(streak),
      dominantMood,
      variance: applyLaplaceNoise(variance),
      totalCheckins: recentCheckins.length,
      privacyProtected: true
    });

  } catch (error) {
    console.error('Error fetching orb summary:', error);
    res.status(500).json({ error: 'Failed to fetch orb summary' });
  }
});

export default router;
