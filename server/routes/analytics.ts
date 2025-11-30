import { Router, Request, Response, NextFunction } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db.ts';

export const analyticsRouter = Router();

/**
 * TASK 10: Privacy-safe analytics endpoints
 * All endpoints return aggregate data only - no individual user IDs
 * Admin authentication required
 */

// Admin authentication middleware
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isAdminSession) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Apply admin check to all routes
analyticsRouter.use(requireAdmin);

// Mood trends by day (30 days)
analyticsRouter.get('/mood-by-day', async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        date_trunc('day', c.timestamp) AS day,
        AVG(c.mood_level_1_6)::float AS avg_mood,
        COUNT(*)::int AS count
      FROM checkins c
      WHERE c.timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day ASC
    `);

    const data = rows.rows.map((row: any) => ({
      date: row.day ? new Date(row.day).toISOString().slice(0, 10) : null,
      avgMood: row.avg_mood,
      count: row.count,
    }));

    return res.json({ data });
  } catch (err) {
    console.error('[Analytics] mood-by-day error', err);
    return res.status(500).json({ error: 'Failed to load mood analytics' });
  }
});

// Crisis detections by day (30 days)
analyticsRouter.get('/crisis-by-day', async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        date_trunc('day', c.timestamp) AS day,
        COUNT(*)::int AS crisis_count
      FROM checkins c
      WHERE c.timestamp >= NOW() - INTERVAL '30 days'
        AND c.crisis_flagged = TRUE
      GROUP BY day
      ORDER BY day ASC
    `);

    const data = rows.rows.map((row: any) => ({
      date: row.day ? new Date(row.day).toISOString().slice(0, 10) : null,
      crisisCount: row.crisis_count,
    }));

    return res.json({ data });
  } catch (err) {
    console.error('[Analytics] crisis-by-day error', err);
    return res.status(500).json({ error: 'Failed to load crisis analytics' });
  }
});

// Program engagement (30 days)
analyticsRouter.get('/program-engagement', async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        a.program_id,
        p.title,
        COUNT(*)::int AS attendance_count
      FROM attendance a
      JOIN programs p ON p.id = a.program_id
      WHERE a.timestamp >= NOW() - INTERVAL '30 days'
      GROUP BY a.program_id, p.title
      ORDER BY attendance_count DESC
      LIMIT 50
    `);

    const data = rows.rows.map((row: any) => ({
      programId: row.program_id,
      title: row.title,
      attendanceCount: row.attendance_count,
    }));

    return res.json({ data });
  } catch (err) {
    console.error('[Analytics] program-engagement error', err);
    return res.status(500).json({ error: 'Failed to load program analytics' });
  }
});

// TASK 14: AI transparency metrics
analyticsRouter.get('/ai-transparency', async (req, res) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        date,
        total_messages,
        crisis_detected,
        moderation_flagged
      FROM ai_transparency_metrics
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY date ASC
    `);

    const data = rows.rows.map((row: any) => ({
      date: row.date ? new Date(row.date).toISOString().slice(0, 10) : null,
      totalMessages: row.total_messages,
      crisisDetected: row.crisis_detected,
      moderationFlagged: row.moderation_flagged,
    }));

    return res.json({ data });
  } catch (err) {
    console.error('[Analytics] ai-transparency error', err);
    return res.status(500).json({ error: 'Failed to load AI transparency metrics' });
  }
});

export default analyticsRouter;
