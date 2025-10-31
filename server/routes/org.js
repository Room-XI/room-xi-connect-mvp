import express from 'express';
import { db } from '../db.js';
import { attendance, programs, profiles } from '../schema.js';
import { eq, sql, desc } from 'drizzle-orm';

const router = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, req.session.userId))
      .limit(1);

    if (!profile || !['org_admin', 'admin'].includes(profile.role)) {
      return res.status(403).json({ error: 'Organization admin access required' });
    }

    res.json({
      totalAttendance: 0,
      uniqueParticipants: 0,
      programs: [],
      recentActivity: [],
    });
  } catch (error) {
    console.error('Error fetching org dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch org dashboard' });
  }
});

export default router;
