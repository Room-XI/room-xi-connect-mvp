import express from 'express';
import { db } from '../db.js';
import { weeklyOrbSnapshots, checkins, profiles } from '../schema.js';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { DateTime } from 'luxon';

const router = express.Router();

// Get mood counts for a user over a date range
async function getMoodCounts(userId, startDate, endDate) {
  const checkInsData = await db
    .select({
      moodType: checkins.moodType,
      count: sql`count(*)`,
    })
    .from(checkins)
    .where(
      and(
        eq(checkins.userId, userId),
        gte(checkins.checkinDate, startDate),
        lte(checkins.checkinDate, endDate)
      )
    )
    .groupBy(checkins.moodType);

  const counts = {
    cold: 0,
    stormy: 0,
    foggy: 0,
    clear: 0,
    breezy: 0,
    aurora: 0,
  };

  checkInsData.forEach(row => {
    if (row.moodType && counts.hasOwnProperty(row.moodType)) {
      counts[row.moodType] = Number(row.count);
    }
  });

  return counts;
}

// Calculate average mood level for the week
async function getAverageMoodLevel(userId, startDate, endDate) {
  const result = await db
    .select({
      avgMood: sql`avg(mood_level_1_6)::decimal(3,2)`,
      count: sql`count(*)`,
    })
    .from(checkins)
    .where(
      and(
        eq(checkins.userId, userId),
        gte(checkins.checkinDate, startDate),
        lte(checkins.checkinDate, endDate)
      )
    );

  return {
    average: result[0]?.avgMood || null,
    count: Number(result[0]?.count || 0),
  };
}

// Capture a weekly snapshot for a user
export async function captureWeeklySnapshot(userId) {
  try {
    // Use America/Edmonton timezone
    const edmontonTime = DateTime.now().setZone('America/Edmonton');
    const snapshotDate = edmontonTime.toISODate();
    
    // Calculate week start (Monday) and end (Sunday)
    const weekEnd = edmontonTime.startOf('week').plus({ days: 6 }); // Sunday
    const weekStart = edmontonTime.startOf('week'); // Monday
    
    const weekStartDate = weekStart.toISODate();
    const weekEndDate = weekEnd.toISODate();

    // Check if snapshot already exists for this week
    const existingSnapshot = await db
      .select()
      .from(weeklyOrbSnapshots)
      .where(
        and(
          eq(weeklyOrbSnapshots.userId, userId),
          eq(weeklyOrbSnapshots.snapshotDate, snapshotDate)
        )
      )
      .limit(1);

    if (existingSnapshot.length > 0) {
      console.log(`Weekly snapshot already exists for user ${userId} on ${snapshotDate}`);
      return existingSnapshot[0];
    }

    // Get mood counts for the week
    const moodCounts = await getMoodCounts(userId, weekStartDate, weekEndDate);
    
    // Calculate total check-ins
    const totalCheckIns = Object.values(moodCounts).reduce((sum, count) => sum + count, 0);
    
    // Calculate ratios
    const ratios = {};
    let dominantMood = 'clear';
    let maxCount = 0;
    
    Object.keys(moodCounts).forEach(mood => {
      const ratio = totalCheckIns > 0 ? moodCounts[mood] / 7 : 0;
      ratios[`${mood}Ratio`] = ratio.toFixed(3);
      
      if (moodCounts[mood] > maxCount) {
        maxCount = moodCounts[mood];
        dominantMood = mood;
      }
    });

    // Get average mood level
    const { average: avgMoodLevel } = await getAverageMoodLevel(userId, weekStartDate, weekEndDate);

    // Create visual data JSON
    const visualData = {
      moodCounts,
      ratios,
      dominantMood,
      colors: {
        cold: { h: 210, s: 70, l: 45 },
        stormy: { h: 280, s: 60, l: 40 },
        foggy: { h: 200, s: 20, l: 60 },
        clear: { h: 60, s: 70, l: 60 },
        breezy: { h: 160, s: 60, l: 50 },
        aurora: { h: 340, s: 80, l: 60 },
      },
      capturedAt: edmontonTime.toISO(),
    };

    // Insert the snapshot
    const [snapshot] = await db
      .insert(weeklyOrbSnapshots)
      .values({
        userId,
        snapshotDate,
        weekStartDate,
        weekEndDate,
        ...ratios,
        dominantMood,
        totalCheckIns,
        averageMoodLevel: avgMoodLevel,
        visualData,
      })
      .returning();

    console.log(`Weekly snapshot captured for user ${userId} on ${snapshotDate}`);
    return snapshot;
  } catch (error) {
    console.error('Error capturing weekly snapshot:', error);
    throw error;
  }
}

// Capture snapshots for all active users
export async function captureAllWeeklySnapshots() {
  try {
    // Get all users who have checked in within the last 30 days
    const thirtyDaysAgo = DateTime.now().setZone('America/Edmonton').minus({ days: 30 }).toISODate();
    
    const activeUsers = await db
      .selectDistinct({ userId: checkins.userId })
      .from(checkins)
      .where(gte(checkins.checkinDate, thirtyDaysAgo));

    console.log(`Capturing weekly snapshots for ${activeUsers.length} active users`);

    const results = await Promise.allSettled(
      activeUsers.map(({ userId }) => captureWeeklySnapshot(userId))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Weekly snapshots: ${successful} successful, ${failed} failed`);
    
    return { successful, failed };
  } catch (error) {
    console.error('Error capturing all weekly snapshots:', error);
    throw error;
  }
}

// API endpoint to manually trigger snapshot capture
router.post('/capture', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Check if user is admin
    const [profile] = await db
      .select({ isAdmin: profiles.isAdmin })
      .from(profiles)
      .where(eq(profiles.userId, req.session.userId))
      .limit(1);

    if (!profile?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await captureAllWeeklySnapshots();
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in manual snapshot capture:', error);
    res.status(500).json({ error: 'Failed to capture snapshots' });
  }
});

// Get user's weekly snapshots for the last 30 days
router.get('/recent', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const thirtyDaysAgo = DateTime.now().setZone('America/Edmonton').minus({ days: 30 }).toISODate();

    const snapshots = await db
      .select()
      .from(weeklyOrbSnapshots)
      .where(
        and(
          eq(weeklyOrbSnapshots.userId, req.session.userId),
          gte(weeklyOrbSnapshots.snapshotDate, thirtyDaysAgo)
        )
      )
      .orderBy(desc(weeklyOrbSnapshots.snapshotDate));

    res.json(snapshots);
  } catch (error) {
    console.error('Error fetching recent snapshots:', error);
    res.status(500).json({ error: 'Failed to fetch snapshots' });
  }
});

// Get a specific user's snapshot by date
router.get('/:date', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { date } = req.params;

    const [snapshot] = await db
      .select()
      .from(weeklyOrbSnapshots)
      .where(
        and(
          eq(weeklyOrbSnapshots.userId, req.session.userId),
          eq(weeklyOrbSnapshots.snapshotDate, date)
        )
      )
      .limit(1);

    if (!snapshot) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }

    res.json(snapshot);
  } catch (error) {
    console.error('Error fetching snapshot:', error);
    res.status(500).json({ error: 'Failed to fetch snapshot' });
  }
});

export default router;