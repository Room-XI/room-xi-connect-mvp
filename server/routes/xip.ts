import express, { Request, Response } from 'express';
import { db } from '../db.js';
import { xipPoints, xipActivities, xipRewards, xipRewardClaims, profiles } from '../schema.js';
import { eq, desc, sql, and, gte } from 'drizzle-orm';
import logger from '../logger.ts';

const router = express.Router();

const POINTS = {
  MOOD_CHECKIN: 10,
  PROGRAM_ATTENDANCE: 25,
  PROFILE_COMPLETE: 50,
  STREAK_BONUS_7: 50,
  STREAK_BONUS_30: 200,
};

const LEVELS = [
  { level: 1, name: 'Newcomer', minPoints: 0 },
  { level: 2, name: 'Explorer', minPoints: 100 },
  { level: 3, name: 'Contributor', minPoints: 300 },
  { level: 4, name: 'Achiever', minPoints: 600 },
  { level: 5, name: 'Champion', minPoints: 1000 },
  { level: 6, name: 'Leader', minPoints: 1500 },
  { level: 7, name: 'Mentor', minPoints: 2200 },
  { level: 8, name: 'Visionary', minPoints: 3000 },
  { level: 9, name: 'Legend', minPoints: 4000 },
  { level: 10, name: 'Enlightened', minPoints: 5000 },
];

function calculateLevel(points: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].minPoints) {
      return LEVELS[i].level;
    }
  }
  return 1;
}

async function getOrCreateUserPoints(userId: string) {
  let [stats] = await db.select().from(xipPoints).where(eq(xipPoints.userId, userId));
  if (!stats) {
    [stats] = await db.insert(xipPoints).values({ userId }).returning();
  }
  return stats;
}

router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await getOrCreateUserPoints(userId);

    const currentLevel = LEVELS.find(l => l.level === stats.level) || LEVELS[0];
    const nextLevel = LEVELS.find(l => l.level === stats.level + 1);
    
    const rankResult = await db.execute(sql`
      SELECT COUNT(*) + 1 as rank 
      FROM xip_points 
      WHERE total_points > ${stats.totalPoints}
    `);
    const rank = Number(rankResult.rows[0]?.rank || 1);

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyResult = await db.select({
      total: sql<number>`COALESCE(SUM(points_awarded), 0)`
    }).from(xipActivities).where(
      and(
        eq(xipActivities.userId, userId), 
        gte(xipActivities.createdAt, weekAgo)
      )
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyResult = await db.select({
      total: sql<number>`COALESCE(SUM(points_awarded), 0)`
    }).from(xipActivities).where(
      and(
        eq(xipActivities.userId, userId), 
        gte(xipActivities.createdAt, today)
      )
    );

    res.json({
      totalPoints: stats.totalPoints,
      level: stats.level,
      levelName: currentLevel.name,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      rank,
      weeklyPoints: Number(weeklyResult[0]?.total || 0),
      dailyPoints: Number(dailyResult[0]?.total || 0),
      nextLevel: nextLevel ? {
        level: nextLevel.level,
        name: nextLevel.name,
        pointsRequired: nextLevel.minPoints,
        pointsToGo: Math.max(0, nextLevel.minPoints - stats.totalPoints),
        progress: Math.min(100, ((stats.totalPoints - currentLevel.minPoints) / (nextLevel.minPoints - currentLevel.minPoints)) * 100)
      } : null,
      levels: LEVELS
    });
  } catch (error) {
    logger.error({ err: error, context: 'xip-stats' }, 'Failed to fetch XiP stats');
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

router.get('/activities', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const activities = await db.select()
      .from(xipActivities)
      .where(eq(xipActivities.userId, userId))
      .orderBy(desc(xipActivities.createdAt))
      .limit(limit)
      .offset(offset);

    const activityNames: Record<string, string> = {
      'mood_checkin': 'Daily Check-in',
      'program_attendance': 'Program Attendance',
      'profile_complete': 'Profile Completed',
      'streak_bonus_7': '7-Day Streak Bonus',
      'streak_bonus_30': '30-Day Streak Bonus',
    };

    const formattedActivities = activities.map(a => ({
      ...a,
      activityName: activityNames[a.activityType] || a.activityType,
    }));

    res.json(formattedActivities);
  } catch (error) {
    logger.error({ err: error, context: 'xip-activities' }, 'Failed to fetch XiP activities');
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

router.get('/rewards', async (req: Request, res: Response) => {
  try {
    const rewards = await db.select()
      .from(xipRewards)
      .where(eq(xipRewards.active, true))
      .orderBy(xipRewards.pointCost);

    res.json(rewards);
  } catch (error) {
    logger.error({ err: error, context: 'xip-rewards' }, 'Failed to fetch XiP rewards');
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

router.post('/rewards/:id/claim', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rewardId = req.params.id;

    const [reward] = await db.select().from(xipRewards).where(eq(xipRewards.id, rewardId));
    if (!reward) {
      return res.status(404).json({ error: 'Reward not found' });
    }

    if (!reward.active) {
      return res.status(400).json({ error: 'Reward is no longer available' });
    }

    if (reward.quantityAvailable !== null && reward.quantityAvailable <= 0) {
      return res.status(400).json({ error: 'Reward is out of stock' });
    }

    const userStats = await getOrCreateUserPoints(userId);
    if (userStats.totalPoints < reward.pointCost) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    await db.update(xipPoints)
      .set({
        totalPoints: userStats.totalPoints - reward.pointCost,
        updatedAt: new Date(),
      })
      .where(eq(xipPoints.userId, userId));

    if (reward.quantityAvailable !== null) {
      await db.update(xipRewards)
        .set({ quantityAvailable: reward.quantityAvailable - 1 })
        .where(eq(xipRewards.id, rewardId));
    }

    const [claim] = await db.insert(xipRewardClaims)
      .values({
        userId,
        rewardId,
        status: 'pending',
      })
      .returning();

    res.json({ 
      success: true, 
      claim,
      newBalance: userStats.totalPoints - reward.pointCost
    });
  } catch (error) {
    logger.error({ err: error, context: 'xip-claim' }, 'Failed to claim XiP reward');
    res.status(500).json({ error: 'Failed to claim reward' });
  }
});

router.get('/claims', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const claims = await db.select({
      id: xipRewardClaims.id,
      status: xipRewardClaims.status,
      claimedAt: xipRewardClaims.claimedAt,
      fulfilledAt: xipRewardClaims.fulfilledAt,
      rewardId: xipRewardClaims.rewardId,
      title: xipRewards.title,
      description: xipRewards.description,
      pointCost: xipRewards.pointCost,
      category: xipRewards.category,
    })
    .from(xipRewardClaims)
    .innerJoin(xipRewards, eq(xipRewardClaims.rewardId, xipRewards.id))
    .where(eq(xipRewardClaims.userId, userId))
    .orderBy(desc(xipRewardClaims.claimedAt));

    res.json(claims);
  } catch (error) {
    logger.error({ err: error, context: 'xip-claims' }, 'Failed to fetch XiP claims');
    res.status(500).json({ error: 'Failed to fetch claims' });
  }
});

router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
    const userId = req.session?.userId;

    const leaderboard = await db.select({
      odUserId: xipPoints.userId,
      totalPoints: xipPoints.totalPoints,
      level: xipPoints.level,
      currentStreak: xipPoints.currentStreak,
      firstName: profiles.firstName,
      preferredName: profiles.preferredName,
    })
    .from(xipPoints)
    .innerJoin(profiles, eq(xipPoints.userId, profiles.userId))
    .orderBy(desc(xipPoints.totalPoints))
    .limit(limit);

    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      odUserId: entry.odUserId,
      totalPoints: entry.totalPoints,
      level: entry.level,
      levelName: LEVELS.find(l => l.level === entry.level)?.name || 'Newcomer',
      currentStreak: entry.currentStreak,
      isCurrentUser: entry.odUserId === userId,
      displayName: entry.preferredName || entry.firstName || 'Anonymous',
    }));

    res.json(formattedLeaderboard);
  } catch (error) {
    logger.error({ err: error, context: 'xip-leaderboard' }, 'Failed to fetch XiP leaderboard');
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

export async function awardXipPoints(userId: string, activityType: string, metadata?: any): Promise<{ success: boolean; pointsAwarded?: number; newTotal?: number }> {
  try {
    const pointsMap: Record<string, number> = {
      'mood_checkin': POINTS.MOOD_CHECKIN,
      'program_attendance': POINTS.PROGRAM_ATTENDANCE,
      'profile_complete': POINTS.PROFILE_COMPLETE,
      'streak_bonus_7': POINTS.STREAK_BONUS_7,
      'streak_bonus_30': POINTS.STREAK_BONUS_30,
    };

    const pointsToAward = pointsMap[activityType];
    if (!pointsToAward) {
      logger.warn({ context: 'xip', activityType }, 'Unknown XiP activity type');
      return { success: false };
    }

    const stats = await getOrCreateUserPoints(userId);

    const today = new Date().toISOString().split('T')[0];
    
    let newStreak = stats.currentStreak;
    let newLongestStreak = stats.longestStreak;
    
    if (activityType === 'mood_checkin') {
      if (stats.lastActivityDate) {
        const lastDate = new Date(stats.lastActivityDate);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
          newStreak = stats.currentStreak + 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      } else {
        newStreak = 1;
      }
      
      newLongestStreak = Math.max(newLongestStreak, newStreak);
    }

    const newTotal = stats.totalPoints + pointsToAward;
    const newLevel = calculateLevel(newTotal);

    await db.update(xipPoints)
      .set({
        totalPoints: newTotal,
        level: newLevel,
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastActivityDate: activityType === 'mood_checkin' ? today : stats.lastActivityDate,
        updatedAt: new Date(),
      })
      .where(eq(xipPoints.userId, userId));

    await db.insert(xipActivities).values({
      userId,
      activityType,
      pointsAwarded: pointsToAward,
      metadata,
    });

    if (newStreak === 7 && stats.currentStreak < 7) {
      await awardXipPoints(userId, 'streak_bonus_7', { streak: 7 });
    } else if (newStreak === 30 && stats.currentStreak < 30) {
      await awardXipPoints(userId, 'streak_bonus_30', { streak: 30 });
    }

    return {
      success: true,
      pointsAwarded: pointsToAward,
      newTotal,
    };
  } catch (error) {
    logger.error({ err: error, context: 'xip-award' }, 'Failed to award XiP points');
    return { success: false };
  }
}

export { POINTS, LEVELS };
export default router;
