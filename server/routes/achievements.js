import { Router } from 'express';
import { eq, gte, and, sql, desc } from 'drizzle-orm';
import { db } from '../db.js';
import { checkins, savedPrograms } from '../schema.js';
import logger from '../logger.ts';

const router = Router();

/**
 * Calculate user achievements based on their activity
 */
async function calculateAchievements(userId) {
  const achievements = [];
  
  try {
    // Get user's check-in data
    const userCheckins = await db
      .select()
      .from(checkins)
      .where(eq(checkins.userId, userId))
      .orderBy(desc(checkins.createdAt));
    
    // Get user's saved programs
    const userPrograms = await db
      .select()
      .from(savedPrograms)
      .where(eq(savedPrograms.userId, userId));

    // Achievement: First Steps (complete first check-in)
    if (userCheckins.length > 0) {
      achievements.push({
        id: 'first-steps',
        name: 'First Steps',
        description: 'Complete your first mood check-in',
        icon: 'star',
        category: 'checkin',
        points: 10,
        unlockedAt: userCheckins[userCheckins.length - 1].createdAt,
        rarity: 'common'
      });
    }

    // Achievement: Week Warrior (7-day streak)
    const hasWeekStreak = userCheckins.some(checkin => 
      checkin.streakCount && checkin.streakCount >= 7
    );
    if (hasWeekStreak) {
      achievements.push({
        id: 'week-warrior',
        name: 'Week Warrior',
        description: 'Maintain a 7-day check-in streak',
        icon: 'calendar',
        category: 'streak',
        points: 50,
        unlockedAt: userCheckins.find(c => c.streakCount >= 7)?.createdAt,
        rarity: 'rare'
      });
    } else {
      // Show progress
      const currentStreak = userCheckins[0]?.streakCount || 0;
      achievements.push({
        id: 'week-warrior',
        name: 'Week Warrior',
        description: 'Maintain a 7-day check-in streak',
        icon: 'calendar',
        category: 'streak',
        points: 50,
        progress: currentStreak,
        maxProgress: 7,
        rarity: 'rare'
      });
    }

    // Achievement: Month Master (30-day streak)
    const hasMonthStreak = userCheckins.some(checkin => 
      checkin.streakCount && checkin.streakCount >= 30
    );
    if (hasMonthStreak) {
      achievements.push({
        id: 'month-master',
        name: 'Consistency King',
        description: 'Check in for 30 consecutive days',
        icon: 'trending',
        category: 'streak',
        points: 150,
        unlockedAt: userCheckins.find(c => c.streakCount >= 30)?.createdAt,
        rarity: 'epic'
      });
    }

    // Achievement: Aurora Seeker (reach Aurora mood multiple times)
    const auroraMoods = userCheckins.filter(c => c.mood === 'aurora').length;
    if (auroraMoods >= 10) {
      achievements.push({
        id: 'aurora-seeker',
        name: 'Aurora Seeker',
        description: 'Reach Aurora mood 10 times',
        icon: 'trophy',
        category: 'special',
        points: 200,
        unlockedAt: userCheckins.filter(c => c.mood === 'aurora')[9]?.createdAt,
        rarity: 'legendary'
      });
    } else if (auroraMoods > 0) {
      achievements.push({
        id: 'aurora-seeker',
        name: 'Aurora Seeker',
        description: 'Reach Aurora mood 10 times',
        icon: 'trophy',
        category: 'special',
        points: 200,
        progress: auroraMoods,
        maxProgress: 10,
        rarity: 'legendary'
      });
    }

    // Achievement: Program Explorer (save programs)
    if (userPrograms.length >= 5) {
      achievements.push({
        id: 'program-explorer',
        name: 'Program Explorer',
        description: 'Save 5 programs to your list',
        icon: 'heart',
        category: 'program',
        points: 30,
        unlockedAt: userPrograms[4]?.createdAt,
        rarity: 'common'
      });
    } else if (userPrograms.length > 0) {
      achievements.push({
        id: 'program-explorer',
        name: 'Program Explorer',
        description: 'Save 5 programs to your list',
        icon: 'heart',
        category: 'program',
        points: 30,
        progress: userPrograms.length,
        maxProgress: 5,
        rarity: 'common'
      });
    }

    return achievements;
  } catch (error) {
    logger.error({ err: error, context: 'achievements-calculate' }, 'Error calculating achievements');
    return [];
  }
}

/**
 * Get user's achievements and stats
 */
router.get('/', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const achievements = await calculateAchievements(req.session.userId);
    
    // Calculate user stats
    const unlockedAchievements = achievements.filter(a => a.unlockedAt);
    const totalPoints = unlockedAchievements.reduce((sum, a) => sum + a.points, 0);
    
    // Simple level calculation (100 points per level)
    const level = Math.floor(totalPoints / 100) + 1;
    const nextLevelPoints = level * 100;
    
    // Determine rank based on total points
    let rank = 'Newcomer';
    if (totalPoints >= 1000) rank = 'Legend';
    else if (totalPoints >= 500) rank = 'Master';
    else if (totalPoints >= 250) rank = 'Expert';
    else if (totalPoints >= 100) rank = 'Rising Star';
    else if (totalPoints >= 50) rank = 'Explorer';

    const stats = {
      totalPoints,
      level,
      nextLevelPoints,
      rank,
      unlockedCount: unlockedAchievements.length,
      totalAchievements: 25 // Total available achievements
    };

    res.json({ achievements, stats });
  } catch (error) {
    logger.error({ err: error, context: 'achievements-fetch' }, 'Error fetching achievements');
    res.status(500).json({ error: 'Failed to fetch achievements' });
  }
});

/**
 * Check for new achievements (called after actions)
 */
router.post('/check', async (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const achievements = await calculateAchievements(req.session.userId);
    const newlyUnlocked = achievements.filter(a => {
      if (!a.unlockedAt) return false;
      const unlockTime = new Date(a.unlockedAt).getTime();
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      return unlockTime > fiveMinutesAgo;
    });

    res.json({ newlyUnlocked });
  } catch (error) {
    logger.error({ err: error, context: 'achievements-check' }, 'Error checking achievements');
    res.status(500).json({ error: 'Failed to check achievements' });
  }
});

export default router;