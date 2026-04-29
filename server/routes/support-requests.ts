import express from 'express';
import { db } from '../db.ts';
import { users, profiles } from '../schema.ts';
import { supportRequests } from '../schema.extras.ts';
import { youthWorkers, youthWorkerAssignments } from '../schema-extensions.ts';
import { eq, desc, and, inArray, sql } from 'drizzle-orm';
import logger from '../logger.ts';
import { validateCsrfToken } from '../middleware/security.ts';
import { requireOrgScope } from '../middleware/permissions.ts';

const youthRouter = express.Router();
const workerRouter = express.Router();

youthRouter.post('/', validateCsrfToken, async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { category, message } = req.body;
    if (!category || !message?.trim()) {
      return res.status(400).json({ error: 'Category and message are required' });
    }

    const validCategories = ['program', 'account', 'feedback', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const [request] = await db.insert(supportRequests).values({
      userId,
      category,
      message: message.trim(),
    }).returning();

    logger.info({ requestId: request.id, userId, category }, 'Support request created');

    res.status(201).json({
      ok: true,
      request: {
        id: request.id,
        category: request.category,
        message: request.message,
        status: request.status,
        createdAt: request.createdAt,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error creating support request');
    res.status(500).json({ error: 'Internal server error' });
  }
});

youthRouter.get('/mine', async (req, res) => {
  try {
    const userId = req.session?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const results = await db.select({
      id: supportRequests.id,
      category: supportRequests.category,
      message: supportRequests.message,
      status: supportRequests.status,
      createdAt: supportRequests.createdAt,
      updatedAt: supportRequests.updatedAt,
    })
      .from(supportRequests)
      .where(eq(supportRequests.userId, userId))
      .orderBy(desc(supportRequests.createdAt))
      .limit(50);

    res.json({ requests: results });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching user support requests');
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function getOrgScopedYouthIds(orgId: string): Promise<string[]> {
  const orgWorkers = await db.select({ id: youthWorkers.id })
    .from(youthWorkers)
    .where(eq(youthWorkers.organizationId, orgId));

  if (orgWorkers.length === 0) return [];

  const workerIds = orgWorkers.map(w => w.id);
  const assignments = await db.select({ youthId: youthWorkerAssignments.youthId })
    .from(youthWorkerAssignments)
    .where(inArray(youthWorkerAssignments.youthWorkerId, workerIds));

  return assignments.map(a => a.youthId);
}

workerRouter.use(requireOrgScope());

workerRouter.get('/', async (req, res) => {
  try {
    const orgId = req.session?.organizationId;
    if (!orgId) {
      return res.status(403).json({ error: 'Organization scope required' });
    }

    const youthIds = await getOrgScopedYouthIds(orgId);

    if (youthIds.length === 0) {
      return res.json({ tickets: [] });
    }

    const status = req.query.status as string | undefined;

    const conditions = [inArray(supportRequests.userId, youthIds)];
    if (status && ['new', 'in_progress', 'resolved'].includes(status)) {
      conditions.push(eq(supportRequests.status, status));
    }

    const results = await db.select({
      id: supportRequests.id,
      userId: supportRequests.userId,
      category: supportRequests.category,
      message: supportRequests.message,
      status: supportRequests.status,
      assignedWorkerId: supportRequests.assignedWorkerId,
      workerNotes: supportRequests.workerNotes,
      resolvedAt: supportRequests.resolvedAt,
      createdAt: supportRequests.createdAt,
      updatedAt: supportRequests.updatedAt,
      youthName: profiles.preferredName,
      youthFirstName: profiles.firstName,
    })
      .from(supportRequests)
      .leftJoin(profiles, eq(supportRequests.userId, profiles.userId))
      .where(and(...conditions))
      .orderBy(desc(supportRequests.createdAt))
      .limit(100);

    const tickets = results.map(r => ({
      id: r.id,
      userId: r.userId,
      youthName: r.youthName || r.youthFirstName || 'Youth',
      category: r.category,
      message: r.message,
      status: r.status,
      assignedWorkerId: r.assignedWorkerId,
      workerNotes: r.workerNotes,
      resolvedAt: r.resolvedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }));

    res.json({ tickets });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching support requests');
    res.status(500).json({ error: 'Internal server error' });
  }
});

workerRouter.get('/:id', async (req, res) => {
  try {
    const orgId = req.session?.organizationId;
    if (!orgId) {
      return res.status(403).json({ error: 'Organization scope required' });
    }

    const youthIds = await getOrgScopedYouthIds(orgId);

    const [result] = await db.select({
      id: supportRequests.id,
      userId: supportRequests.userId,
      category: supportRequests.category,
      message: supportRequests.message,
      status: supportRequests.status,
      assignedWorkerId: supportRequests.assignedWorkerId,
      workerNotes: supportRequests.workerNotes,
      resolvedAt: supportRequests.resolvedAt,
      createdAt: supportRequests.createdAt,
      updatedAt: supportRequests.updatedAt,
      youthName: profiles.preferredName,
      youthFirstName: profiles.firstName,
    })
      .from(supportRequests)
      .leftJoin(profiles, eq(supportRequests.userId, profiles.userId))
      .where(and(
        eq(supportRequests.id, req.params.id),
        inArray(supportRequests.userId, youthIds.length > 0 ? youthIds : ['00000000-0000-0000-0000-000000000000'])
      ))
      .limit(1);

    if (!result) {
      return res.status(404).json({ error: 'Support request not found' });
    }

    res.json({
      ticket: {
        ...result,
        youthName: result.youthName || result.youthFirstName || 'Youth',
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching support request');
    res.status(500).json({ error: 'Internal server error' });
  }
});

workerRouter.patch('/:id', validateCsrfToken, async (req, res) => {
  try {
    const orgId = req.session?.organizationId;
    if (!orgId) {
      return res.status(403).json({ error: 'Organization scope required' });
    }

    const youthIds = await getOrgScopedYouthIds(orgId);

    const [existing] = await db.select({ id: supportRequests.id, userId: supportRequests.userId })
      .from(supportRequests)
      .where(eq(supportRequests.id, req.params.id))
      .limit(1);

    if (!existing) {
      return res.status(404).json({ error: 'Support request not found' });
    }

    if (!youthIds.includes(existing.userId)) {
      logger.warn({
        context: 'bola-blocked',
        workerId: req.session?.youthWorkerId,
        orgId,
        ticketId: req.params.id,
      }, 'BOLA attempt blocked: worker tried to update ticket outside org scope');
      return res.status(403).json({ error: 'Access denied: ticket outside your organization scope' });
    }

    const { status, workerNotes } = req.body;
    const validStatuses = ['new', 'in_progress', 'resolved'];

    const updateFields: Record<string, unknown> = { updatedAt: new Date() };

    if (status) {
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updateFields.status = status;
      updateFields.assignedWorkerId = req.session?.youthWorkerId;
      if (status === 'resolved') {
        updateFields.resolvedAt = new Date();
      } else {
        updateFields.resolvedAt = null;
      }
    }

    if (workerNotes !== undefined) {
      updateFields.workerNotes = workerNotes;
    }

    const [updated] = await db.update(supportRequests)
      .set(updateFields)
      .where(eq(supportRequests.id, req.params.id))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: 'Support request not found' });
    }

    logger.info({
      requestId: updated.id,
      workerId: req.session?.youthWorkerId,
      orgId,
      newStatus: status,
    }, 'Support request updated');

    res.json({ ok: true, ticket: updated });
  } catch (error) {
    logger.error({ err: error }, 'Error updating support request');
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { youthRouter, workerRouter };
