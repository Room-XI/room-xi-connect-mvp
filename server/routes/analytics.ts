import { Router, Request, Response, NextFunction } from 'express';
import { sql } from 'drizzle-orm';
import { db } from '../db.ts';
import logger from '../logger.ts';
import { enforceDifferentialPrivacy } from '../middleware/differentialPrivacy.ts';

export const analyticsRouter = Router();

/**
 * TASK 10: Privacy-safe analytics endpoints
 * All endpoints return aggregate data only - no individual user IDs
 * Admin authentication required (supports both admin portal and profile-based admin)
 * Differential privacy middleware applied to protect small cohorts
 */

// Admin authentication middleware - accepts both isAdminSession (portal login) and isAdmin (profile flag)
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.isAdminSession && !req.session?.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Apply admin check to all routes
analyticsRouter.use(requireAdmin);

// Mood trends by day (30 days)
analyticsRouter.get('/mood-by-day', 
  enforceDifferentialPrivacy({ operation: 'mood_analytics', tableName: 'checkins', queryType: 'aggregate' }),
  async (req, res) => {
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
      logger.error({ err, context: 'analytics', endpoint: 'mood-by-day' }, 'Failed to load mood analytics');
      return res.status(500).json({ error: 'Failed to load mood analytics' });
    }
  }
);

// Crisis detections by day (30 days)
analyticsRouter.get('/crisis-by-day', 
  enforceDifferentialPrivacy({ operation: 'crisis_analytics', tableName: 'checkins', queryType: 'aggregate' }),
  async (req, res) => {
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
      logger.error({ err, context: 'analytics', endpoint: 'crisis-by-day' }, 'Failed to load crisis analytics');
      return res.status(500).json({ error: 'Failed to load crisis analytics' });
    }
  }
);

// Program engagement (30 days)
analyticsRouter.get('/program-engagement', 
  enforceDifferentialPrivacy({ operation: 'program_engagement', tableName: 'attendance', queryType: 'aggregate' }),
  async (req, res) => {
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
      logger.error({ err, context: 'analytics', endpoint: 'program-engagement' }, 'Failed to load program analytics');
      return res.status(500).json({ error: 'Failed to load program analytics' });
    }
  }
);

// TASK 14: AI transparency metrics
analyticsRouter.get('/ai-transparency', 
  enforceDifferentialPrivacy({ operation: 'ai_transparency', tableName: 'ai_transparency_metrics', queryType: 'aggregate' }),
  async (req, res) => {
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
      logger.error({ err, context: 'analytics', endpoint: 'ai-transparency' }, 'Failed to load AI transparency metrics');
      return res.status(500).json({ error: 'Failed to load AI transparency metrics' });
    }
  }
);

export default analyticsRouter;
