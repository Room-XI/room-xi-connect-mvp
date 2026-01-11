import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../db.js';
import { 
  checkins, 
  profiles, 
  programs, 
  attendance, 
  adminLogs, 
  ximiConversations,
  users,
  organizations,
  orgMembers,
  consentEvents
} from '../schema.js';
import { eq, sql, desc, and, gte, lte, ilike, or } from 'drizzle-orm';
import { authLimiter } from '../middleware/rateLimit.js';
import logger from '../logger.ts';

const router = express.Router();

// Admin credentials from environment (required in production)
const ACCESS_CODE = process.env.ADMIN_ACCESS_CODE;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Log warning if credentials are not set
if (!ACCESS_CODE || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  logger.warn({ context: 'admin-init' }, 'ADMIN_ACCESS_CODE, ADMIN_USERNAME, and ADMIN_PASSWORD must be set for admin portal access');
}

// Rate limiting for access attempts
const accessAttempts = new Map();

// ==================== TWO-LAYER AUTH ENDPOINTS ====================

// Verify access code (first layer of auth)
router.post('/verify-access', async (req, res) => {
  try {
    if (!ACCESS_CODE || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
      return res.status(503).json({ 
        message: 'Admin portal is not configured. Please set ADMIN_ACCESS_CODE, ADMIN_USERNAME, and ADMIN_PASSWORD environment variables.' 
      });
    }

    const { code } = req.body;
    const ip = req.ip;

    const attempts = accessAttempts.get(ip) || 0;
    if (attempts > 5) {
      return res.status(429).json({ 
        message: 'Too many attempts. Please try again later.' 
      });
    }

    if (code !== ACCESS_CODE) {
      accessAttempts.set(ip, attempts + 1);
      setTimeout(() => accessAttempts.delete(ip), 300000);
      return res.status(401).json({ 
        message: 'Invalid access code' 
      });
    }

    accessAttempts.delete(ip);
    req.session.adminAccessGranted = true;
    
    const adminCsrfToken = crypto.randomBytes(32).toString('hex');
    req.session.adminCsrfToken = adminCsrfToken;

    res.json({ 
      success: true,
      csrfToken: adminCsrfToken 
    });
  } catch (error) {
    logger.error({ err: error, context: 'admin-verify-access' }, 'Access verification error');
    res.status(500).json({ 
      message: 'Access verification failed' 
    });
  }
});

// Get admin CSRF token (only if access granted)
router.get('/csrf-token', (req, res) => {
  if (!req.session.adminAccessGranted) {
    return res.status(401).json({ 
      message: 'Access not granted' 
    });
  }

  if (!req.session.adminCsrfToken) {
    req.session.adminCsrfToken = crypto.randomBytes(32).toString('hex');
  }

  res.json({ 
    csrfToken: req.session.adminCsrfToken 
  });
});

// Admin login (requires access granted - second layer of auth)
router.post('/login', authLimiter, async (req, res) => {
  try {
    if (!ACCESS_CODE || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
      return res.status(503).json({ 
        message: 'Admin portal is not configured.' 
      });
    }

    if (!req.session.adminAccessGranted) {
      return res.status(401).json({ 
        message: 'Access not granted. Please enter access code first.' 
      });
    }

    const csrfToken = req.headers['x-csrf-token'];
    if (!csrfToken || csrfToken !== req.session.adminCsrfToken) {
      return res.status(403).json({ 
        message: 'Invalid or missing CSRF token' 
      });
    }

    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const isValidUsername = username === ADMIN_USERNAME;
    let isValidPassword = false;
    
    if (ADMIN_PASSWORD && ADMIN_PASSWORD.startsWith('$2')) {
      isValidPassword = await bcrypt.compare(password, ADMIN_PASSWORD);
    } else {
      if (process.env.NODE_ENV === 'production') {
        logger.warn({ context: 'admin-login' }, 'ADMIN_PASSWORD should be a bcrypt hash in production');
      }
      isValidPassword = password === ADMIN_PASSWORD;
    }
    
    if (!isValidUsername || !isValidPassword) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    req.session.regenerate((err) => {
      if (err) {
        logger.error({ err, context: 'admin-login' }, 'Session regeneration error');
        return res.status(500).json({ 
          message: 'Session error' 
        });
      }

      req.session.isAdminSession = true;
      req.session.adminAccessGranted = true;
      req.session.adminUsername = username;
      req.session.adminCsrfToken = crypto.randomBytes(32).toString('hex');

      req.session.save((saveErr) => {
        if (saveErr) {
          logger.error({ err: saveErr, context: 'admin-login-session-save' }, 'Session save error');
          return res.status(500).json({ message: 'Session error' });
        }

        res.json({
          success: true,
          message: 'Admin login successful',
          csrfToken: req.session.adminCsrfToken,
          admin: {
            username: username,
          }
        });
      });
    });
  } catch (error) {
    logger.error({ err: error, context: 'admin-login' }, 'Admin login error');
    res.status(500).json({ 
      message: 'Login failed' 
    });
  }
});

// Check admin status
router.get('/status', (req, res) => {
  res.json({
    isAdmin: req.session.isAdminSession === true,
    hasAccess: req.session.adminAccessGranted === true
  });
});

// Admin logout
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

      res.clearCookie('admin.sid');
      res.json({ success: true });
    });
  } catch (error) {
    logger.error({ err: error, context: 'admin-logout' }, 'Admin logout error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to require admin session
const requireAdminSession = (req, res, next) => {
  if (!req.session.isAdminSession) {
    return res.status(401).json({ message: 'Admin session required' });
  }
  const csrfToken = req.headers['x-csrf-token'];
  if (!csrfToken || csrfToken !== req.session.adminCsrfToken) {
    return res.status(403).json({ message: 'Invalid CSRF token' });
  }
  next();
};

// ==================== ORGANIZATION MANAGEMENT ====================

router.get('/organizations', requireAdminSession, async (req, res) => {
  try {
    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        description: organizations.description,
        contactEmail: organizations.contactEmail,
        website: organizations.website,
        createdAt: organizations.createdAt,
        memberCount: sql`(SELECT COUNT(*) FROM org_members WHERE org_id = ${organizations.id})::int`,
      })
      .from(organizations)
      .orderBy(desc(organizations.createdAt));

    res.json({ organizations: orgs });
  } catch (error) {
    logger.error({ err: error, context: 'admin-list-orgs' }, 'List organizations error');
    res.status(500).json({ message: 'Failed to list organizations' });
  }
});

router.post('/organizations', requireAdminSession, async (req, res) => {
  try {
    const { name, description, contactEmail, website } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Organization name is required' });
    }

    const [org] = await db
      .insert(organizations)
      .values({ name, description, contactEmail, website })
      .returning();

    res.status(201).json({ organization: org });
  } catch (error) {
    logger.error({ err: error, context: 'admin-create-org' }, 'Create organization error');
    res.status(500).json({ message: 'Failed to create organization' });
  }
});

router.put('/organizations/:id', requireAdminSession, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, contactEmail, website } = req.body;

    const [org] = await db
      .update(organizations)
      .set({ name, description, contactEmail, website, updatedAt: new Date() })
      .where(eq(organizations.id, id))
      .returning();

    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }

    res.json({ organization: org });
  } catch (error) {
    logger.error({ err: error, context: 'admin-update-org' }, 'Update organization error');
    res.status(500).json({ message: 'Failed to update organization' });
  }
});

// ==================== USER MANAGEMENT ====================

router.get('/users', requireAdminSession, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    let query = db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        firstName: profiles.firstName,
        preferredName: profiles.preferredName,
        age: profiles.age,
        isAdmin: profiles.isAdmin,
      })
      .from(users)
      .leftJoin(profiles, eq(users.id, profiles.userId));

    if (search) {
      query = query.where(
        or(
          ilike(users.email, `%${search}%`),
          ilike(profiles.firstName, `%${search}%`),
          ilike(profiles.preferredName, `%${search}%`)
        )
      );
    }

    const userList = await query
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(users);

    res.json({
      users: userList,
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error, context: 'admin-list-users' }, 'List users error');
    res.status(500).json({ message: 'Failed to list users' });
  }
});

router.get('/users/:id', requireAdminSession, async (req, res) => {
  try {
    const { id } = req.params;

    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        firstName: profiles.firstName,
        preferredName: profiles.preferredName,
        age: profiles.age,
        city: profiles.city,
        isAdmin: profiles.isAdmin,
        streakCount: profiles.streakCount,
        lastCheckinDate: profiles.lastCheckinDate,
      })
      .from(users)
      .leftJoin(profiles, eq(users.id, profiles.userId))
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    logger.error({ err: error, context: 'admin-get-user' }, 'Get user error');
    res.status(500).json({ message: 'Failed to get user' });
  }
});

router.put('/users/:id/role', requireAdminSession, async (req, res) => {
  try {
    const { id } = req.params;
    const { isAdmin } = req.body;

    if (typeof isAdmin !== 'boolean') {
      return res.status(400).json({ message: 'isAdmin must be a boolean' });
    }

    const [profile] = await db
      .update(profiles)
      .set({ isAdmin, updatedAt: new Date() })
      .where(eq(profiles.userId, id))
      .returning();

    if (!profile) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    res.json({ success: true, isAdmin: profile.isAdmin });
  } catch (error) {
    logger.error({ err: error, context: 'admin-update-user-role' }, 'Update user role error');
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

// ==================== AUDIT LOGS ====================

router.get('/audit-logs', async (req, res) => {
  try {
    if (req.session.isAdminSession) {
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

// Consent audit logs (from consent events table)
router.get('/consent-audit-logs', requireAdminSession, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const offset = (page - 1) * limit;
    const actionType = req.query.actionType || null;

    let query = db
      .select({
        id: consentEvents.id,
        userId: consentEvents.userId,
        action: consentEvents.action,
        consentType: consentEvents.consentType,
        timestamp: consentEvents.timestamp,
        ipAddress: consentEvents.ipAddress,
        userAgent: consentEvents.userAgent,
      })
      .from(consentEvents);

    if (actionType) {
      query = query.where(eq(consentEvents.action, actionType));
    }

    const logs = await query
      .orderBy(desc(consentEvents.timestamp))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql`count(*)::int` })
      .from(consentEvents);

    res.json({
      logs: logs.map(log => ({
        id: log.id,
        userId: log.userId,
        actionType: log.action,
        description: `${log.action} - ${log.consentType || 'N/A'}`,
        timestamp: log.timestamp,
        metadata: { ipAddress: log.ipAddress, userAgent: log.userAgent },
      })),
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error({ err: error, context: 'admin-consent-audit-logs' }, 'Get consent audit logs error');
    res.status(500).json({ message: 'Failed to get consent audit logs' });
  }
});

// ==================== STATS ====================

router.get('/stats', async (req, res) => {
  try {
    if (req.session.isAdminSession) {
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
