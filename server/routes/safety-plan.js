import express from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { db } from '../db.js';
import { safetyPlans, safetyPlanShares, safetyPlanEvents, profiles } from '../schema.ts';
import { eq, and, isNull, gt } from 'drizzle-orm';
import logger from '../logger.ts';

const router = express.Router();

if (!process.env.SAFETY_PLAN_TOKEN_PEPPER) {
  logger.error({ context: 'safety-plan-init' }, 'CRITICAL: SAFETY_PLAN_TOKEN_PEPPER environment variable is required for production');
  throw new Error('SAFETY_PLAN_TOKEN_PEPPER environment variable must be set. Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
}

const SAFETY_PLAN_TOKEN_PEPPER = process.env.SAFETY_PLAN_TOKEN_PEPPER;

function hashToken(token) {
  return crypto.createHash('sha256').update(token + SAFETY_PLAN_TOKEN_PEPPER).digest('hex');
}

const publicViewRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  },
  handler: (req, res) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
    logger.warn({ ip, context: 'safety-plan-rate-limit' }, 'Rate limit exceeded for safety plan public view');
    res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  },
});

const requireAuth = (req, res, next) => {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

async function logEvent(userId, eventType, eventData, req) {
  try {
    await db.insert(safetyPlanEvents).values({
      userId,
      eventType,
      eventData,
      actorIp: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress,
      actorUserAgent: req.headers['user-agent'],
    });
  } catch (error) {
    logger.error({ err: error, context: 'safety-plan-event-log' }, 'Failed to log safety plan event');
  }
}

async function logPublicViewAttempt(eventType, eventData, req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress;
  const userAgent = req.headers['user-agent'];
  
  try {
    await db.insert(safetyPlanEvents).values({
      userId: eventData.planUserId || null,
      eventType,
      eventData: { ...eventData, ip },
      actorIp: ip,
      actorUserAgent: userAgent,
    });
  } catch (error) {
    logger.error({ err: error, context: 'safety-plan-public-view-log' }, 'Failed to log public view attempt');
  }
  
  if (eventType === 'public_view_invalid_token' || eventType === 'public_view_failed') {
    logger.warn({ ip, eventType, ...eventData, context: 'safety-plan-security' }, 'Suspicious public view attempt');
  }
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    let [plan] = await db
      .select()
      .from(safetyPlans)
      .where(eq(safetyPlans.userId, userId))
      .limit(1);

    if (!plan) {
      [plan] = await db
        .insert(safetyPlans)
        .values({ userId })
        .returning();

      await logEvent(userId, 'created', { planVersion: 1 }, req);
    }

    res.json({
      planData: plan.planData,
      planVersion: plan.planVersion,
      lastReviewedAt: plan.lastReviewedAt,
      updatedAt: plan.updatedAt,
    });
  } catch (error) {
    logger.error({ err: error, context: 'safety-plan-get' }, 'Error fetching safety plan');
    res.status(500).json({ error: 'Failed to fetch safety plan' });
  }
});

router.put('/', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { planData, markReviewed } = req.body;

    if (!planData || typeof planData !== 'object') {
      return res.status(400).json({ error: 'planData is required and must be an object' });
    }

    let [existing] = await db
      .select()
      .from(safetyPlans)
      .where(eq(safetyPlans.userId, userId))
      .limit(1);

    const now = new Date();
    const updateData = {
      planData,
      planVersion: (existing?.planVersion || 0) + 1,
      updatedAt: now,
    };

    if (markReviewed) {
      updateData.lastReviewedAt = now;
    }

    let plan;
    if (existing) {
      [plan] = await db
        .update(safetyPlans)
        .set(updateData)
        .where(eq(safetyPlans.userId, userId))
        .returning();
    } else {
      [plan] = await db
        .insert(safetyPlans)
        .values({ userId, ...updateData })
        .returning();
    }

    await logEvent(userId, 'updated', { 
      planVersion: plan.planVersion,
      sections: Object.keys(planData),
    }, req);

    res.json({
      planData: plan.planData,
      planVersion: plan.planVersion,
      lastReviewedAt: plan.lastReviewedAt,
      updatedAt: plan.updatedAt,
    });
  } catch (error) {
    logger.error({ err: error, context: 'safety-plan-update' }, 'Error updating safety plan');
    res.status(500).json({ error: 'Failed to update safety plan' });
  }
});

router.post('/share', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { label, expiresInDays } = req.body;

    const [plan] = await db
      .select()
      .from(safetyPlans)
      .where(eq(safetyPlans.userId, userId))
      .limit(1);

    if (!plan) {
      return res.status(404).json({ error: 'No safety plan found. Please create one first.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);

    const days = expiresInDays && expiresInDays > 0 && expiresInDays <= 90 ? expiresInDays : 7;
    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const [share] = await db
      .insert(safetyPlanShares)
      .values({
        planUserId: userId,
        tokenHash,
        expiresAt,
        label: label || null,
      })
      .returning();

    await logEvent(userId, 'share_created', { 
      shareId: share.id,
      label: label || null,
      expiresAt: expiresAt.toISOString(),
    }, req);

    res.json({
      shareId: share.id,
      token,
      expiresAt: share.expiresAt,
      label: share.label,
    });
  } catch (error) {
    logger.error({ err: error, context: 'safety-plan-share-create' }, 'Error creating share link');
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

router.get('/shares', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;

    const shares = await db
      .select({
        id: safetyPlanShares.id,
        label: safetyPlanShares.label,
        expiresAt: safetyPlanShares.expiresAt,
        accessCount: safetyPlanShares.accessCount,
        lastAccessedAt: safetyPlanShares.lastAccessedAt,
        createdAt: safetyPlanShares.createdAt,
      })
      .from(safetyPlanShares)
      .where(
        and(
          eq(safetyPlanShares.planUserId, userId),
          isNull(safetyPlanShares.revokedAt),
          gt(safetyPlanShares.expiresAt, new Date())
        )
      )
      .orderBy(safetyPlanShares.createdAt);

    res.json({ shares });
  } catch (error) {
    logger.error({ err: error, context: 'safety-plan-shares-list' }, 'Error listing shares');
    res.status(500).json({ error: 'Failed to list shares' });
  }
});

router.delete('/share/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { id } = req.params;

    const [share] = await db
      .select()
      .from(safetyPlanShares)
      .where(eq(safetyPlanShares.id, id))
      .limit(1);

    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    if (share.planUserId !== userId) {
      return res.status(403).json({ error: 'Not authorized to revoke this share' });
    }

    if (share.revokedAt) {
      return res.status(400).json({ error: 'Share already revoked' });
    }

    await db
      .update(safetyPlanShares)
      .set({ revokedAt: new Date() })
      .where(eq(safetyPlanShares.id, id));

    await logEvent(userId, 'share_revoked', { 
      shareId: id,
      label: share.label,
      accessCountAtRevoke: share.accessCount,
    }, req);

    res.json({ ok: true });
  } catch (error) {
    logger.error({ err: error, context: 'safety-plan-share-revoke' }, 'Error revoking share');
    res.status(500).json({ error: 'Failed to revoke share' });
  }
});

router.get('/view/:token', publicViewRateLimiter, async (req, res) => {
  try {
    const { token } = req.params;

    if (!token || token.length !== 64) {
      await logPublicViewAttempt('public_view_invalid_token', { 
        reason: 'invalid_format',
        tokenLength: token?.length,
      }, req);
      return res.status(404).json({ error: 'Invalid or expired share link' });
    }

    const tokenHash = hashToken(token);

    const [share] = await db
      .select()
      .from(safetyPlanShares)
      .where(eq(safetyPlanShares.tokenHash, tokenHash))
      .limit(1);

    if (!share) {
      await logPublicViewAttempt('public_view_invalid_token', { 
        reason: 'token_not_found',
      }, req);
      return res.status(404).json({ error: 'Invalid or expired share link' });
    }

    if (share.revokedAt) {
      await logPublicViewAttempt('public_view_failed', { 
        reason: 'revoked',
        shareId: share.id,
        planUserId: share.planUserId,
      }, req);
      return res.status(410).json({ error: 'This share link has been revoked' });
    }

    if (new Date() > new Date(share.expiresAt)) {
      await logPublicViewAttempt('public_view_failed', { 
        reason: 'expired',
        shareId: share.id,
        planUserId: share.planUserId,
      }, req);
      return res.status(410).json({ error: 'This share link has expired' });
    }

    const [plan] = await db
      .select()
      .from(safetyPlans)
      .where(eq(safetyPlans.userId, share.planUserId))
      .limit(1);

    if (!plan) {
      await logPublicViewAttempt('public_view_failed', { 
        reason: 'plan_not_found',
        shareId: share.id,
        planUserId: share.planUserId,
      }, req);
      return res.status(404).json({ error: 'Safety plan not found' });
    }

    const [profile] = await db
      .select({ firstName: profiles.firstName })
      .from(profiles)
      .where(eq(profiles.userId, share.planUserId))
      .limit(1);

    await db
      .update(safetyPlanShares)
      .set({
        accessCount: share.accessCount + 1,
        lastAccessedAt: new Date(),
      })
      .where(eq(safetyPlanShares.id, share.id));

    await logPublicViewAttempt('public_view_success', { 
      shareId: share.id,
      planUserId: share.planUserId,
      accessCount: share.accessCount + 1,
    }, req);

    res.json({
      ownerFirstName: profile?.firstName || null,
      planData: plan.planData,
      planVersion: plan.planVersion,
      lastReviewedAt: plan.lastReviewedAt,
    });
  } catch (error) {
    logger.error({ err: error, context: 'safety-plan-view' }, 'Error viewing shared safety plan');
    res.status(500).json({ error: 'Failed to load safety plan' });
  }
});

export default router;
