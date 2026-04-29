import express from 'express';
import { db } from '../db.ts';
import { featureFlags, organizations } from '../schema.ts';
import { eq, and, sql } from 'drizzle-orm';
import logger from '../logger.ts';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    if (!req.session?.isAdminSession) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    const flags = await db
      .select({
        flag: featureFlags,
        orgName: organizations.name,
      })
      .from(featureFlags)
      .leftJoin(organizations, eq(featureFlags.orgId, organizations.id))
      .orderBy(featureFlags.featureKey);

    res.json({ flags });
  } catch (error) {
    logger.error({ err: error, context: 'feature-flags-list' }, 'List flags error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    if (!req.session?.isAdminSession) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    const { orgId, featureKey, enabled, metadata } = req.body;

    if (!featureKey) {
      return res.status(400).json({ error: 'featureKey is required' });
    }

    const existing = await db
      .select()
      .from(featureFlags)
      .where(and(
        orgId ? eq(featureFlags.orgId, orgId) : sql`${featureFlags.orgId} IS NULL`,
        eq(featureFlags.featureKey, featureKey)
      ))
      .limit(1);

    if (existing.length > 0) {
      const updateFields: Record<string, unknown> = { enabled: enabled !== false, updatedAt: new Date() };
      if (metadata !== undefined) {
        updateFields.metadata = metadata || null;
      }
      const [updated] = await db
        .update(featureFlags)
        .set(updateFields)
        .where(eq(featureFlags.id, existing[0].id))
        .returning();
      return res.json({ flag: updated });
    }

    const [flag] = await db
      .insert(featureFlags)
      .values({
        orgId: orgId || null,
        featureKey,
        enabled: enabled !== false,
        metadata: metadata || null,
      })
      .returning();

    logger.info({ flagId: flag.id, featureKey, orgId, context: 'feature-flag-create' }, 'Feature flag created');

    res.status(201).json({ flag });
  } catch (error) {
    logger.error({ err: error, context: 'feature-flag-create' }, 'Create flag error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (!req.session?.isAdminSession) {
      return res.status(401).json({ error: 'Admin authentication required' });
    }

    await db.delete(featureFlags).where(eq(featureFlags.id, req.params.id));
    res.json({ success: true });
  } catch (error) {
    logger.error({ err: error, context: 'feature-flag-delete' }, 'Delete flag error');
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/check/:featureKey', async (req, res) => {
  try {
    const { featureKey } = req.params;
    const orgId = req.query.orgId as string | undefined;

    let flag: any = null;
    if (orgId) {
      const [orgFlag] = await db
        .select()
        .from(featureFlags)
        .where(and(eq(featureFlags.orgId, orgId), eq(featureFlags.featureKey, featureKey)))
        .limit(1);
      flag = orgFlag;
    }

    if (!flag) {
      const [globalFlag] = await db
        .select()
        .from(featureFlags)
        .where(and(sql`${featureFlags.orgId} IS NULL`, eq(featureFlags.featureKey, featureKey)))
        .limit(1);
      flag = globalFlag;
    }

    res.json({ enabled: flag?.enabled ?? false });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
