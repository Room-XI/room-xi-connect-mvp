import express from 'express';
import { db } from '../db.js';
import { checkins, profiles, savedPrograms, attendance } from '../schema.js';
import { eq, sql, desc } from 'drizzle-orm';

const router = express.Router();

router.get('/audit-logs', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, req.session.userId))
      .limit(1);

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    res.json([]);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const [profile] = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, req.session.userId))
      .limit(1);

    if (!profile || profile.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const [totalUsers] = await db
      .select({ count: sql`count(*)::int` })
      .from(profiles);

    const [totalCheckins] = await db
      .select({ count: sql`count(*)::int` })
      .from(checkins);

    const [activeUsers] = await db
      .select({ count: sql`count(distinct ${checkins.userId})::int` })
      .from(checkins)
      .where(sql`${checkins.timestamp} > now() - interval '30 days'`);

    res.json({
      totalUsers: totalUsers?.count || 0,
      totalCheckins: totalCheckins?.count || 0,
      activeUsers: activeUsers?.count || 0,
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

export default router;
