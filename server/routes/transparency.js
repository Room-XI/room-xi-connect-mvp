import { Router } from 'express';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db.js';
import { checkins, programs, savedPrograms, ximiConversations } from '../schema.js';
import { applyDifferentialPrivacy } from '../lib/differentialPrivacy.js';

const router = Router();

/**
 * Get aggregated transparency statistics with differential privacy
 * Public endpoint - no authentication required
 */
router.get('/stats', async (req, res) => {
  try {
    // Get current date in Mountain Time
    const now = new Date();
    const today = new Date(now.toLocaleString('en-US', { timeZone: 'America/Edmonton' }));
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);

    // Query 1: Active users in last 30 days
    const activeUsersResult = await db
      .select({ count: sql`COUNT(DISTINCT user_id)` })
      .from(checkins)
      .where(sql`created_at >= ${monthAgo.toISOString()}`);
    
    // Query 2: Daily check-ins today
    const dailyCheckInsResult = await db
      .select({ count: sql`COUNT(*)` })
      .from(checkins)
      .where(sql`created_at >= ${today.toISOString()}`);
    
    // Query 3: Streaks completed this week (7+ day streaks)
    const streaksResult = await db
      .select({ count: sql`COUNT(DISTINCT user_id)` })
      .from(checkins)
      .where(sql`streak_count >= 7 AND created_at >= ${weekAgo.toISOString()}`);
    
    // Query 4: Programs engaged (saved programs) in last 30 days
    const programsEngagedResult = await db
      .select({ count: sql`COUNT(DISTINCT program_id)` })
      .from(savedPrograms)
      .where(sql`created_at >= ${monthAgo.toISOString()}`);
    
    // Query 5: Ximi interactions in last 30 days
    const ximiResult = await db
      .select({ count: sql`COUNT(*)` })
      .from(ximiConversations)
      .where(sql`created_at >= ${monthAgo.toISOString()}`);
    
    // Query 6: Crisis support provided (check-ins with crisis detected)
    const crisisResult = await db
      .select({ count: sql`COUNT(*)` })
      .from(checkins)
      .where(sql`crisis_detected = true AND created_at >= ${monthAgo.toISOString()}`);

    // Extract counts
    const activeUsers = Number(activeUsersResult[0]?.count || 0);
    const dailyCheckIns = Number(dailyCheckInsResult[0]?.count || 0);
    const streaksCompleted = Number(streaksResult[0]?.count || 0);
    const programsEngaged = Number(programsEngagedResult[0]?.count || 0);
    const ximiInteractions = Number(ximiResult[0]?.count || 0);
    const crisisSupport = Number(crisisResult[0]?.count || 0);

    // Apply differential privacy to all statistics
    const stats = applyDifferentialPrivacy({
      activeUsers,
      dailyCheckIns,
      streaksCompleted,
      programsEngaged,
      ximiInteractions,
      crisisSupport
    });

    // Add metadata about privacy protection
    const privacyMetadata = {
      noiseApplied: process.env.NODE_ENV === 'production',
      epsilon: 0.5,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      ...stats,
      privacyMetadata
    });
    
  } catch (error) {
    console.error('Error fetching transparency stats:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transparency data',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get community mood distribution (aggregated, anonymized)
 */
router.get('/mood-distribution', async (req, res) => {
  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Get mood distribution for the past week
    const moodDistribution = await db
      .select({
        mood: checkins.mood,
        count: sql`COUNT(*)::int`
      })
      .from(checkins)
      .where(sql`created_at >= ${weekAgo.toISOString()}`)
      .groupBy(checkins.mood);

    // Convert to object and apply differential privacy
    const distribution = {};
    for (const row of moodDistribution) {
      if (row.mood) {
        const noisyCount = applyDifferentialPrivacy({ count: Number(row.count) });
        distribution[row.mood] = noisyCount.count;
      }
    }

    res.json({
      distribution,
      metadata: {
        period: '7_days',
        noiseApplied: process.env.NODE_ENV === 'production',
        epsilon: 0.5
      }
    });
    
  } catch (error) {
    console.error('Error fetching mood distribution:', error);
    res.status(500).json({ 
      error: 'Failed to fetch mood distribution' 
    });
  }
});

export default router;