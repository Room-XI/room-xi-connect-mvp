import express from 'express';
import type { Request, Response } from 'express';
import { db } from '../db.js';
import { checkins, profiles } from '../schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { calculateStreak, getLocalDateString } from '../services/streak.ts';
import { analyzeMoodTrigger } from '../services/moodAnalysis.ts';
import { requireDataConsent } from '../middleware/consent.ts';
import logger from '../logger.ts';
import { analyzeAndStoreSentiment } from '../services/sentimentOrchestrator.ts';
import { awardXipPoints } from './xip.ts';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    if (!(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userCheckins = await db.select().from(checkins)
      .where(eq(checkins.userId, (req.session as any).userId))
      .orderBy(sql`${checkins.timestamp} DESC`);

    res.json(userCheckins);
  } catch (error) {
    logger.error({ err: error, context: 'checkins-list' }, 'Get checkins error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/summary', async (req: Request, res: Response) => {
  try {
    if (!(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { DateTime } = await import('luxon');
    
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, (req.session as any).userId)).limit(1);
    const userTimezone = (profile as any)?.timezone || 'America/Edmonton';
    const streak7 = Math.min((profile as any)?.streakCount || 0, 7);

    let windowDays = parseInt(req.query.window as string, 10);
    if (!Number.isInteger(windowDays) || windowDays <= 0) {
      windowDays = 7;
    }
    const now = DateTime.now().setZone(userTimezone);
    const windowStart = now.minus({ days: windowDays }).startOf('day');

    const allCheckins = await db.select({
      moodLevel16: checkins.moodLevel16,
      moodType: checkins.moodType,
      checkinDate: checkins.checkinDate,
    }).from(checkins)
      .where(
        and(
          eq(checkins.userId, (req.session as any).userId),
          sql`${checkins.timestamp} >= ${windowStart.toJSDate()}`
        )
      );

    const moodMap: Record<number, string> = {
      1: 'cold',
      2: 'stormy',
      3: 'foggy',
      4: 'clear',
      5: 'breezy',
      6: 'aurora'
    };

    const checkInsByDay: Record<string, string[]> = {};
    allCheckins.forEach((checkin: any) => {
      const date = checkin.checkinDate;
      if (!checkInsByDay[date]) {
        checkInsByDay[date] = [];
      }
      const moodName = checkin.moodType || moodMap[checkin.moodLevel16];
      if (moodName) {
        checkInsByDay[date].push(moodName);
      }
    });

    const ratios: Record<string, number> = {
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
        const dayRatios: Record<string, number> = { cold: 0, stormy: 0, foggy: 0, clear: 0, breezy: 0, aurora: 0 };
        
        dayMoods.forEach(mood => {
          dayRatios[mood] = (dayRatios[mood] || 0) + 1;
        });
        
        Object.keys(dayRatios).forEach(mood => {
          const dayMoodRatio = dayRatios[mood] / dayTotal;
          ratios[mood] += dayMoodRatio / windowDays;
        });
      });
    }

    const dailyAverageMoods = Object.values(checkInsByDay).map(dayMoods => {
      const dayScores = dayMoods.map(moodName => {
        const moodScore = Object.keys(moodMap).find(key => moodMap[parseInt(key)] === moodName);
        return parseInt(moodScore as string) || 4;
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

    const consistencyIndex = daysWithData / windowDays;

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

router.get('/summary-range', async (req: Request, res: Response) => {
  try {
    if (!(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate are required (YYYY-MM-DD format)' });
    }

    const { DateTime } = await import('luxon');
    
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, (req.session as any).userId)).limit(1);
    const userTimezone = (profile as any)?.timezone || 'America/Edmonton';

    const start = DateTime.fromISO(startDate as string, { zone: userTimezone }).startOf('day');
    const end = DateTime.fromISO(endDate as string, { zone: userTimezone }).endOf('day');
    const windowDays = Math.ceil(end.diff(start, 'days').days);

    const allCheckins = await db.select({
      moodLevel16: checkins.moodLevel16,
      moodType: checkins.moodType,
      checkinDate: checkins.checkinDate,
    }).from(checkins)
      .where(
        and(
          eq(checkins.userId, (req.session as any).userId),
          sql`${checkins.timestamp} >= ${start.toJSDate()}`,
          sql`${checkins.timestamp} <= ${end.toJSDate()}`
        )
      );

    const moodMap: Record<number, string> = {
      1: 'cold',
      2: 'stormy',
      3: 'foggy',
      4: 'clear',
      5: 'breezy',
      6: 'aurora'
    };

    const checkInsByDay: Record<string, string[]> = {};
    allCheckins.forEach((checkin: any) => {
      const date = checkin.checkinDate;
      if (!checkInsByDay[date]) {
        checkInsByDay[date] = [];
      }
      const moodName = checkin.moodType || moodMap[checkin.moodLevel16];
      if (moodName) {
        checkInsByDay[date].push(moodName);
      }
    });

    const ratios: Record<string, number> = {
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
        const dayRatios: Record<string, number> = { cold: 0, stormy: 0, foggy: 0, clear: 0, breezy: 0, aurora: 0 };
        
        dayMoods.forEach(mood => {
          dayRatios[mood] = (dayRatios[mood] || 0) + 1;
        });
        
        Object.keys(dayRatios).forEach(mood => {
          const dayMoodRatio = dayRatios[mood] / dayTotal;
          ratios[mood] += dayMoodRatio / windowDays;
        });
      });
    }

    const moodScores = allCheckins.map((c: any) => c.moodLevel16);
    let variance = 0;
    if (moodScores.length > 0) {
      const mean = moodScores.reduce((sum: number, score: number) => sum + score, 0) / moodScores.length;
      const squaredDiffs = moodScores.map((score: number) => Math.pow(score - mean, 2));
      variance = Math.sqrt(squaredDiffs.reduce((sum: number, diff: number) => sum + diff, 0) / moodScores.length) / 6;
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

router.get('/last-7-days', async (req: Request, res: Response) => {
  try {
    if (!(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, (req.session as any).userId)).limit(1);
    const userTimezone = (profile as any)?.timezone || 'America/Edmonton';

    const { DateTime } = await import('luxon');
    const now = DateTime.now().setZone(userTimezone);
    const sevenDaysAgo = now.minus({ days: 7 }).startOf('day');

    const recentCheckins = await db.select({
      id: checkins.id,
      mood: checkins.moodLevel16,
      timestamp: checkins.timestamp,
      checkinDate: checkins.checkinDate,
    }).from(checkins)
      .where(
        and(
          eq(checkins.userId, (req.session as any).userId),
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

router.post('/', requireDataConsent(), async (req: Request, res: Response) => {
  try {
    if (!(req.session as any).userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { timestamp, dimension, moodLevel16, moodType, wellnessDimensions, affectTags, note, localTz } = req.body;

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
    
    const [profile] = await db.select().from(profiles).where(eq(profiles.userId, (req.session as any).userId)).limit(1);
    const userTimezone = (profile as any)?.timezone || localTz || 'America/Edmonton';
    
    const dateStr = getLocalDateString(checkinTimestamp.toISOString(), userTimezone);

    const existingCheckins = await db.select().from(checkins)
      .where(
        and(
          eq(checkins.userId, (req.session as any).userId),
          eq(checkins.checkinDate, dateStr)
        )
      );

    let result: any;
    if (existingCheckins.length > 0) {
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
      [result] = await db.insert(checkins)
        .values({
          userId: (req.session as any).userId,
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

    if (profile) {
      const streakResult = calculateStreak(
        (profile as any).lastCheckinDate,
        (profile as any).streakCount || 0,
        userTimezone,
        checkinTimestamp
      );

      await db.update(profiles)
        .set({
          lastCheckinDate: dateStr,
          streakCount: streakResult.newStreak,
        })
        .where(eq(profiles.userId, (req.session as any).userId));
    }

    let ximiTrigger: any = null;
    if (moodType) {
      try {
        const triggerResult = await analyzeMoodTrigger((req.session as any).userId, moodType);
        if (triggerResult.shouldTrigger) {
          ximiTrigger = {
            triggered: true,
            reason: triggerResult.reason,
            details: triggerResult.details
          };
        }
      } catch (error) {
        logger.error({ err: error, context: 'checkins-mood-trigger' }, 'Mood trigger analysis failed');
      }
    }

    if (note && result.id) {
      analyzeAndStoreSentiment((req.session as any).userId, 'checkin', result.id, note)
        .catch((err: any) => logger.error({ err, context: 'checkins-sentiment' }, 'Sentiment analysis failed'));
    }

    if (existingCheckins.length === 0) {
      awardXipPoints((req.session as any).userId, 'mood_checkin', { checkinId: result.id })
        .catch((err: any) => logger.error({ err, context: 'checkins-xip' }, 'XiP point award failed'));
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
