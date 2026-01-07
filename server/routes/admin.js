import express from 'express';
import { db } from '../db.js';
import { 
  checkins, 
  profiles, 
  programs, 
  attendance, 
  adminLogs, 
  ximiConversations,
  users 
} from '../schema.js';
import { eq, sql, desc, and, gte, lte } from 'drizzle-orm';
import { authLimiter } from '../middleware/rateLimit.js';
import logger from '../logger.ts';

const router = express.Router();

router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPasswordHash = process.env.ADMIN_PASSWORD;

    if (!adminUsername || !adminPasswordHash) {
      logger.error({ context: 'admin-login' }, 'Admin credentials not configured in environment variables');
      return res.status(500).json({ error: 'Admin login not configured' });
    }

    if (username !== adminUsername) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    const bcrypt = await import('bcrypt');
    const validPassword = await bcrypt.compare(password, adminPasswordHash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }

    req.session.regenerate((err) => {
      if (err) {
        logger.error({ err, context: 'admin-login-session' }, 'Session regeneration error');
        return res.status(500).json({ error: 'Session error' });
      }

      req.session.isAdminSession = true;
      req.session.adminUsername = username;

      req.session.save((saveErr) => {
        if (saveErr) {
          logger.error({ err: saveErr, context: 'admin-login-session-save' }, 'Session save error');
          return res.status(500).json({ error: 'Session error' });
        }

        res.json({
          success: true,
          admin: {
            username: username,
          }
        });
      });
    });
  } catch (error) {
    logger.error({ err: error, context: 'admin-login' }, 'Admin login error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/logout', async (req, res) => {
  try {
    if (!req.session.isAdminSession) {
      return res.status(401).json({ error: 'Not logged in as admin' });
    }

    req.session.destroy((err) => {
      if (err) {
        logger.error({ err, context: 'admin-logout' }, 'Session destruction error');
        return res.status(500).json({ error: 'Logout failed' });
      }

      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  } catch (error) {
    logger.error({ err: error, context: 'admin-logout' }, 'Admin logout error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/audit-logs', async (req, res) => {
  try {
    if (req.session.isAdminSession) {
      // Admin session - skip user checks
    } else if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    } else {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, req.session.userId))
        .limit(1);

      if (!profile || !profile.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
    }

    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = (page - 1) * limit;
    const action = req.query.action;
    const startDate = req.query.startDate;
    const endDate = req.query.endDate;

    const conditions = [];
    
    if (action && action !== 'all') {
      conditions.push(eq(adminLogs.action, action.toUpperCase()));
    }
    
    if (startDate) {
      conditions.push(gte(adminLogs.timestamp, new Date(startDate)));
    }
    
    if (endDate) {
      conditions.push(lte(adminLogs.timestamp, new Date(endDate)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const logs = await db
      .select()
      .from(adminLogs)
      .where(whereClause)
      .orderBy(desc(adminLogs.timestamp))
      .limit(limit)
      .offset(offset);

    const [totalResult] = await db
      .select({ count: sql`count(*)::int` })
      .from(adminLogs)
      .where(whereClause);

    res.json({
      logs: logs.map(log => ({
        id: log.id.toString(),
        action: log.action,
        table_name: log.tableName,
        record_id: log.recordId,
        old_values: log.oldRecord,
        new_values: log.newRecord,
        timestamp: log.timestamp,
        user_id: log.userId,
      })),
      pagination: {
        page,
        limit,
        total: totalResult?.count || 0,
        totalPages: Math.ceil((totalResult?.count || 0) / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error, context: 'admin-audit-logs' }, 'Error fetching audit logs');
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    if (req.session.isAdminSession) {
      // Admin session - skip user checks
    } else if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    } else {
      const [profile] = await db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, req.session.userId))
        .limit(1);

      if (!profile || !profile.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }
    }

    const [totalUsers] = await db
      .select({ count: sql`count(*)::int` })
      .from(users);

    const [totalCheckins] = await db
      .select({ count: sql`count(*)::int` })
      .from(checkins);

    const [activeUsers] = await db
      .select({ count: sql`count(distinct ${checkins.userId})::int` })
      .from(checkins)
      .where(sql`${checkins.timestamp} > now() - interval '30 days'`);

    const [totalPrograms] = await db
      .select({ count: sql`count(*)::int` })
      .from(programs);

    const [totalAttendance] = await db
      .select({ count: sql`count(*)::int` })
      .from(attendance);

    const [ximiConversationsCount] = await db
      .select({ count: sql`count(*)::int` })
      .from(ximiConversations);

    const [crisisFlagsCount] = await db
      .select({ count: sql`count(*)::int` })
      .from(checkins)
      .where(eq(checkins.crisisFlagged, true));

    const [crisisResolvedCount] = await db
      .select({ count: sql`count(*)::int` })
      .from(checkins)
      .where(
        and(
          eq(checkins.crisisFlagged, true),
          sql`${checkins.crisisResolvedAt} IS NOT NULL`
        )
      );

    const userGrowth = await db
      .select({
        date: sql`DATE(${users.createdAt})`.as('date'),
        count: sql`count(*)::int`.as('count'),
      })
      .from(users)
      .where(sql`${users.createdAt} > now() - interval '30 days'`)
      .groupBy(sql`DATE(${users.createdAt})`)
      .orderBy(sql`DATE(${users.createdAt})`);

    const checkinTrends = await db
      .select({
        date: sql`DATE(${checkins.timestamp})`.as('date'),
        count: sql`count(*)::int`.as('count'),
      })
      .from(checkins)
      .where(sql`${checkins.timestamp} > now() - interval '30 days'`)
      .groupBy(sql`DATE(${checkins.timestamp})`)
      .orderBy(sql`DATE(${checkins.timestamp})`);

    const avgDailyCheckins = checkinTrends.length > 0
      ? Math.round(checkinTrends.reduce((sum, day) => sum + day.count, 0) / checkinTrends.length)
      : 0;

    const crisisResolutionRate = crisisFlagsCount?.count > 0
      ? Math.round((crisisResolvedCount?.count / crisisFlagsCount?.count) * 100)
      : 0;

    res.json({
      totalUsers: totalUsers?.count || 0,
      totalCheckins: totalCheckins?.count || 0,
      activeUsers: activeUsers?.count || 0,
      totalPrograms: totalPrograms?.count || 0,
      totalAttendance: totalAttendance?.count || 0,
      ximiConversationsCount: ximiConversationsCount?.count || 0,
      crisisFlagsCount: crisisFlagsCount?.count || 0,
      crisisResolutionRate,
      avgDailyCheckins,
      userGrowth: userGrowth.map(row => ({
        date: row.date,
        count: row.count,
      })),
      checkinTrends: checkinTrends.map(row => ({
        date: row.date,
        count: row.count,
      })),
    });
  } catch (error) {
    logger.error({ err: error, context: 'admin-stats' }, 'Error fetching admin stats');
    res.status(500).json({ error: 'Failed to fetch admin stats' });
  }
});

export default router;
