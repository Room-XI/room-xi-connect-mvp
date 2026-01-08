import { Router } from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db.js';
import { users, organizations, orgMembers, profiles, consentEvents } from '../schema.js';
import { eq, desc, sql, ilike, or } from 'drizzle-orm';
import crypto from 'crypto';
import logger from '../logger.ts';

const router = Router();

// Admin credentials from environment (required in production)
const ACCESS_CODE = process.env.ADMIN_ACCESS_CODE;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Log warning if credentials are not set
if (!ACCESS_CODE || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  logger.warn({ context: 'admin-portal-init' }, 'ADMIN_ACCESS_CODE, ADMIN_USERNAME, and ADMIN_PASSWORD must be set for admin portal access');
}

// Rate limiting for access attempts
const accessAttempts = new Map();

// Verify access code
router.post('/verify-access', async (req, res) => {
  try {
    // Fail-safe: disable admin portal if credentials not configured
    if (!ACCESS_CODE || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
      return res.status(503).json({ 
        message: 'Admin portal is not configured. Please set ADMIN_ACCESS_CODE, ADMIN_USERNAME, and ADMIN_PASSWORD environment variables.' 
      });
    }

    const { code } = req.body;
    const ip = req.ip;

    // Rate limiting
    const attempts = accessAttempts.get(ip) || 0;
    if (attempts > 5) {
      return res.status(429).json({ 
        message: 'Too many attempts. Please try again later.' 
      });
    }

    if (code !== ACCESS_CODE) {
      accessAttempts.set(ip, attempts + 1);
      setTimeout(() => accessAttempts.delete(ip), 300000); // Reset after 5 minutes
      return res.status(401).json({ 
        message: 'Invalid access code' 
      });
    }

    // Clear attempts on success
    accessAttempts.delete(ip);

    // Grant access in session
    req.session.adminAccessGranted = true;
    
    // Generate admin-specific CSRF token
    const adminCsrfToken = crypto.randomBytes(32).toString('hex');
    req.session.adminCsrfToken = adminCsrfToken;

    res.json({ 
      success: true,
      csrfToken: adminCsrfToken 
    });
  } catch (error) {
    logger.error({ err: error, context: 'admin-portal-verify-access' }, 'Access verification error');
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

// Admin login (requires access granted)
router.post('/login', async (req, res) => {
  try {
    // Fail-safe: disable admin portal if credentials not configured
    if (!ACCESS_CODE || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
      return res.status(503).json({ 
        message: 'Admin portal is not configured.' 
      });
    }

    // Check access granted
    if (!req.session.adminAccessGranted) {
      return res.status(401).json({ 
        message: 'Access not granted. Please enter access code first.' 
      });
    }

    // Validate admin CSRF token
    const csrfToken = req.headers['x-csrf-token'];
    if (!csrfToken || csrfToken !== req.session.adminCsrfToken) {
      return res.status(403).json({ 
        message: 'Invalid or missing CSRF token' 
      });
    }

    const { username, password } = req.body;

    // Validate credentials using bcrypt for password comparison
    // ADMIN_PASSWORD should be a bcrypt hash in production
    const isValidUsername = username === ADMIN_USERNAME;
    let isValidPassword = false;
    
    // Check if ADMIN_PASSWORD is a bcrypt hash (starts with $2b$ or $2a$)
    if (ADMIN_PASSWORD && ADMIN_PASSWORD.startsWith('$2')) {
      isValidPassword = await bcrypt.compare(password, ADMIN_PASSWORD);
    } else {
      // Fallback for development: plaintext comparison (with warning)
      if (process.env.NODE_ENV === 'production') {
        logger.warn({ context: 'admin-portal-login' }, 'ADMIN_PASSWORD should be a bcrypt hash in production');
      }
      isValidPassword = password === ADMIN_PASSWORD;
    }
    
    if (!isValidUsername || !isValidPassword) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    // Create admin session
    req.session.regenerate((err) => {
      if (err) {
        logger.error({ err, context: 'admin-portal-login' }, 'Session regeneration error');
        return res.status(500).json({ 
          message: 'Session error' 
        });
      }

      req.session.isAdminSession = true;
      req.session.adminAccessGranted = true;
      req.session.adminCsrfToken = crypto.randomBytes(32).toString('hex');

      res.json({
        success: true,
        message: 'Admin login successful',
        csrfToken: req.session.adminCsrfToken
      });
    });
  } catch (error) {
    logger.error({ err: error, context: 'admin-portal-login' }, 'Admin login error');
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
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error({ err, context: 'admin-portal-logout' }, 'Logout error');
      return res.status(500).json({ 
        message: 'Logout failed' 
      });
    }
    res.json({ 
      success: true 
    });
  });
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

// List all organizations
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
    logger.error({ err: error, context: 'admin-portal-list-orgs' }, 'List organizations error');
    res.status(500).json({ message: 'Failed to list organizations' });
  }
});

// Create organization
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
    logger.error({ err: error, context: 'admin-portal-create-org' }, 'Create organization error');
    res.status(500).json({ message: 'Failed to create organization' });
  }
});

// Update organization
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
    logger.error({ err: error, context: 'admin-portal-update-org' }, 'Update organization error');
    res.status(500).json({ message: 'Failed to update organization' });
  }
});

// ==================== USER MANAGEMENT ====================

// List users with pagination and search
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
    logger.error({ err: error, context: 'admin-portal-list-users' }, 'List users error');
    res.status(500).json({ message: 'Failed to list users' });
  }
});

// Get single user details
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
    logger.error({ err: error, context: 'admin-portal-get-user' }, 'Get user error');
    res.status(500).json({ message: 'Failed to get user' });
  }
});

// Update user role
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
    logger.error({ err: error, context: 'admin-portal-update-user-role' }, 'Update user role error');
    res.status(500).json({ message: 'Failed to update user role' });
  }
});

// ==================== AUDIT LOG VIEWER ====================

// Get audit logs (consent events and other audit trail)
router.get('/audit-logs', requireAdminSession, async (req, res) => {
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
    logger.error({ err: error, context: 'admin-portal-audit-logs' }, 'Get audit logs error');
    res.status(500).json({ message: 'Failed to get audit logs' });
  }
});

export default router;