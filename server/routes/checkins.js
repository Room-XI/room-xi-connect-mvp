import express from 'express';
import { db } from '../db.js';
import { checkins, profiles } from '../schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { calculateStreak, getLocalDateString } from '../services/streak.ts';
import { analyzeMoodTrigger } from '../services/moodAnalysis.ts';
import { requireDataConsent } from '../middleware/consent.ts';
import logger from '../logger.ts';

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
    logger.error({ err: error, context: 'checkins-list' }, 'Get checkins error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get mood orb summary with per-day 1/7 weighting
router.get('/summary', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { DateTime } = await import('luxon');
    
    // Get user profile for timezone and streak
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, req.session.userId)).limit(1);
    const userTimezone = profile?.timezone || 'America/Edmonton';
    const streak7 = Math.min(profile?.streakCount || 0, 7);

    // Calculate window (default 7 days) - ensure valid positive integer
    let windowDays = parseInt(req.query.window, 10);
    if (!Number.isInteger(windowDays) || windowDays <= 0) {
      windowDays = 7;
    }
    const now = DateTime.now().setZone(userTimezone);
    const windowStart = now.minus({ days: windowDays }).startOf('day');

    // Get all check-ins from the window
    const allCheckins = await db.select({
      moodLevel16: checkins.moodLevel16,
      moodType: checkins.moodType,
      checkinDate: checkins.checkinDate,
    }).from(checkins)
      .where(
        and(
          eq(checkins.userId, req.session.userId),
          sql`${checkins.timestamp} >= ${windowStart.toJSDate()}`
        )
      );

    // Map mood numeric values (1-6) to mood names
    const moodMap = {
      1: 'cold',
      2: 'stormy',
      3: 'foggy',
      4: 'clear',
      5: 'breezy',
      6: 'aurora'
    };

    // Group check-ins by date
    const checkInsByDay = {};
    allCheckins.forEach(checkin => {
      const date = checkin.checkinDate;
      if (!checkInsByDay[date]) {
        checkInsByDay[date] = [];
      }
      const moodName = checkin.moodType || moodMap[checkin.moodLevel16];
      if (moodName) {
        checkInsByDay[date].push(moodName);
      }
    });

    // Calculate per-day mood ratios, then apply 1/7 weighting
    const ratios = {
      cold: 0,
      stormy: 0,
      foggy: 0,
      clear: 0,
      breezy: 0,
      aurora: 0
    };

    const daysWithData = Object.keys(checkInsByDay).length;
    
    if (daysWithData > 0) {
      // For each day, calculate that day's mood mix
      Object.values(checkInsByDay).forEach(dayMoods => {
        const dayTotal = dayMoods.length;
        const dayRatios = { cold: 0, stormy: 0, foggy: 0, clear: 0, breezy: 0, aurora: 0 };
        
        // Count moods for this day
        dayMoods.forEach(mood => {
          dayRatios[mood] = (dayRatios[mood] || 0) + 1;
        });
        
        // Convert to ratios and apply 1/7 weight to this day
        Object.keys(dayRatios).forEach(mood => {
          const dayMoodRatio = dayRatios[mood] / dayTotal;
          ratios[mood] += dayMoodRatio / windowDays;
        });
      });
    }

    // Calculate variance using per-day aggregates (not individual check-ins)
    const dailyAverageMoods = Object.values(checkInsByDay).map(dayMoods => {
      const dayScores = dayMoods.map(moodName => {
        const moodScore = Object.keys(moodMap).find(key => moodMap[key] === moodName);
        return parseInt(moodScore) || 4;
      });
      return dayScores.reduce((sum, score) => sum + score, 0) / dayScores.length;
    });
    
    let variance = 0;
    let variabilityIndex = 0;
    if (dailyAverageMoods.length > 0) {
      const mean = dailyAverageMoods.reduce((sum, score) => sum + score, 0) / dailyAverageMoods.length;
      const squaredDiffs = dailyAverageMoods.map(score => Math.pow(score - mean, 2));
      const stdDev = Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / dailyAverageMoods.length);
      variance = stdDev / 6;
      variabilityIndex = stdDev;
    }

    // Calculate consistency index (fraction of days checked in)
    const consistencyIndex = daysWithData / windowDays;

    // Find dominant mood (only if we have data)
    const dominant = daysWithData > 0 
      ? Object.entries(ratios).reduce((a, b) => a[1] > b[1] ? a : b)[0]
      : null;

    res.json({
      ratios,
      variance: parseFloat(variance.toFixed(2)),
      variabilityIndex: parseFloat(variabilityIndex.toFixed(2)),
      consistencyIndex: parseFloat(consistencyIndex.toFixed(2)),
      streak7,
      dominant,
      daysWithData
    });
  } catch (error) {
    logger.error({ err: error, context: 'checkins-summary' }, 'Get mood summary error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get mood summary for custom date range (for week-over-week comparison)
router.get('/summary-range', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required (YYYY-MM-DD format)' });
    }

    const { DateTime } = await import('luxon');
    
    // Get user profile for timezone
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, req.session.userId)).limit(1);
    const userTimezone = profile?.timezone || 'America/Edmonton';

    // Parse dates and calculate window size
    const start = DateTime.fromISO(startDate, { zone: userTimezone }).startOf('day');
    const end = DateTime.fromISO(endDate, { zone: userTimezone }).endOf('day');
    const windowDays = Math.ceil(end.diff(start, 'days').days);

    // Get all check-ins in the range
    const allCheckins = await db.select({
      moodLevel16: checkins.moodLevel16,
      moodType: checkins.moodType,
      checkinDate: checkins.checkinDate,
    }).from(checkins)
      .where(
        and(
          eq(checkins.userId, req.session.userId),
          sql`${checkins.timestamp} >= ${start.toJSDate()}`,
          sql`${checkins.timestamp} <= ${end.toJSDate()}`
        )
      );

    // Map mood values
    const moodMap = {
      1: 'cold',
      2: 'stormy',
      3: 'foggy',
      4: 'clear',
      5: 'breezy',
      6: 'aurora'
    };

    // Group by date
    const checkInsByDay = {};
    allCheckins.forEach(checkin => {
      const date = checkin.checkinDate;
      if (!checkInsByDay[date]) {
        checkInsByDay[date] = [];
      }
      const moodName = checkin.moodType || moodMap[checkin.moodLevel16];
      if (moodName) {
        checkInsByDay[date].push(moodName);
      }
    });

    // Calculate per-day ratios with 1/N weighting
    const ratios = {
      cold: 0,
      stormy: 0,
      foggy: 0,
      clear: 0,
      breezy: 0,
      aurora: 0
    };

    const daysWithData = Object.keys(checkInsByDay).length;
    
    if (daysWithData > 0) {
      Object.values(checkInsByDay).forEach(dayMoods => {
        const dayTotal = dayMoods.length;
        const dayRatios = { cold: 0, stormy: 0, foggy: 0, clear: 0, breezy: 0, aurora: 0 };
        
        dayMoods.forEach(mood => {
          dayRatios[mood] = (dayRatios[mood] || 0) + 1;
        });
        
        Object.keys(dayRatios).forEach(mood => {
          const dayMoodRatio = dayRatios[mood] / dayTotal;
          ratios[mood] += dayMoodRatio / windowDays;
        });
      });
    }

    // Calculate variance
    const moodScores = allCheckins.map(c => c.moodLevel16);
    let variance = 0;
    if (moodScores.length > 0) {
      const mean = moodScores.reduce((sum, score) => sum + score, 0) / moodScores.length;
      const squaredDiffs = moodScores.map(score => Math.pow(score - mean, 2));
      variance = Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / moodScores.length) / 6;
    }

    const dominant = daysWithData > 0 
      ? Object.entries(ratios).reduce((a, b) => a[1] > b[1] ? a : b)[0]
      : null;

    res.json({
      ratios,
      variance: parseFloat(variance.toFixed(2)),
      dominant,
      daysWithData,
      startDate,
      endDate,
      windowDays
    });
  } catch (error) {
    logger.error({ err: error, context: 'checkins-summary-range' }, 'Get summary range error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get last 7 days of check-ins for mood orb gradient
router.get('/last-7-days', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user timezone
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, req.session.userId)).limit(1);
    const userTimezone = profile?.timezone || 'America/Edmonton';

    // Calculate 7 days ago using Luxon
    const { DateTime } = await import('luxon');
    const now = DateTime.now().setZone(userTimezone);
    const sevenDaysAgo = now.minus({ days: 7 }).startOf('day');

    // Get ALL check-ins from the last 7 calendar days (no limit)
    // This allows proper per-day aggregation when users check in multiple times per day
    const recentCheckins = await db.select({
      id: checkins.id,
      mood: checkins.moodLevel16,
      timestamp: checkins.timestamp,
      checkinDate: checkins.checkinDate,
    }).from(checkins)
      .where(
        and(
          eq(checkins.userId, req.session.userId),
          sql`${checkins.timestamp} >= ${sevenDaysAgo.toJSDate()}`
        )
      )
      .orderBy(sql`${checkins.timestamp} DESC`);

    res.json(recentCheckins);
  } catch (error) {
    logger.error({ err: error, context: 'checkins-last-7-days' }, 'Get last 7 days checkins error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create or update checkin
router.post('/', requireDataConsent(), async (req, res) => {
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

    // Analyze mood trends and check if Ximi should be triggered
    // (15% drop or weekly variance >0.4, with 48h cooldown)
    let ximiTrigger = null;
    if (moodType) {
      try {
        const triggerResult = await analyzeMoodTrigger(req.session.userId, moodType);
        if (triggerResult.shouldTrigger) {
          ximiTrigger = {
            triggered: true,
            reason: triggerResult.reason,
            details: triggerResult.details
          };
        }
      } catch (error) {
        logger.error({ err: error, context: 'checkins-mood-trigger' }, 'Mood trigger analysis failed');
        // Continue without Ximi trigger if analysis fails
      }
    }

    res.status(201).json({
      ...result,
      ximiTrigger
    });
  } catch (error) {
    logger.error({ err: error, context: 'checkins-create' }, 'Create checkin error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
