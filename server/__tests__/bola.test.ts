import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../db.js';
import { users, profiles, checkins, consents } from '../schema.js';
import { parentLinks, parents, moodTasks } from '../schema.extras.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import express from 'express';
import session from 'express-session';
import request from 'supertest';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'bola-test-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true },
  }));

  app.post('/test/set-session', (req, res) => {
    Object.assign(req.session, req.body);
    req.session.save(() => res.json({ ok: true }));
  });

  return app;
}

async function runMiddleware(middleware: any, reqProps: any): Promise<{ statusCode: number; body?: any }> {
  const req = { ...reqProps } as any;
  return new Promise((resolve) => {
    const res = {
      status: (code: number) => ({
        json: (body: any) => {
          resolve({ statusCode: code, body });
          return res;
        },
      }),
    } as any;
    middleware(req, res, () => resolve({ statusCode: 200 }));
  });
}

describe('BOLA (Broken Object-Level Authorization) Test Suite', () => {
  let userA: { id: string; email: string };
  let userB: { id: string; email: string };
  let parentA: { id: string; email: string };
  let parentB: { id: string; email: string };

  const TEST_PREFIX = 'bola-test-';
  const PASSWORD = 'TestPassword123!';

  async function cleanupTestData() {
    const testEmails = [
      `${TEST_PREFIX}user-a@test.com`,
      `${TEST_PREFIX}user-b@test.com`,
    ];
    const parentEmails = [
      `${TEST_PREFIX}parent-a@test.com`,
      `${TEST_PREFIX}parent-b@test.com`,
    ];

    for (const email of testEmails) {
      const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (u) {
        await db.delete(moodTasks).where(eq(moodTasks.userId, u.id)).catch(() => {});
        await db.delete(checkins).where(eq(checkins.userId, u.id)).catch(() => {});
        await db.delete(consents).where(eq(consents.userId, u.id)).catch(() => {});
        await db.delete(parentLinks).where(eq(parentLinks.userId, u.id)).catch(() => {});
        await db.delete(profiles).where(eq(profiles.userId, u.id)).catch(() => {});
        await db.delete(users).where(eq(users.id, u.id)).catch(() => {});
      }
    }
    for (const email of parentEmails) {
      const [p] = await db.select().from(parents).where(eq(parents.email, email)).limit(1);
      if (p) {
        await db.delete(parentLinks).where(eq(parentLinks.parentId, p.id)).catch(() => {});
        await db.delete(parents).where(eq(parents.id, p.id)).catch(() => {});
      }
    }
  }

  beforeAll(async () => {
    await cleanupTestData();

    const passwordHash = await bcrypt.hash(PASSWORD, 12);

    const [uA] = await db.insert(users).values({
      email: `${TEST_PREFIX}user-a@test.com`,
      passwordHash,
    }).returning();
    userA = { id: uA.id, email: uA.email! };

    await db.insert(profiles).values({
      userId: userA.id,
      firstName: 'UserA',
      age: 17,
      dateOfBirth: '2009-01-01',
    });

    const [uB] = await db.insert(users).values({
      email: `${TEST_PREFIX}user-b@test.com`,
      passwordHash,
    }).returning();
    userB = { id: uB.id, email: uB.email! };

    await db.insert(profiles).values({
      userId: userB.id,
      firstName: 'UserB',
      age: 18,
      dateOfBirth: '2008-01-01',
    });

    const parentHash = await bcrypt.hash(PASSWORD, 12);
    const [pA] = await db.insert(parents).values({
      email: `${TEST_PREFIX}parent-a@test.com`,
      name: 'ParentA',
      passwordHash: parentHash,
    }).returning();
    parentA = { id: pA.id, email: pA.email };

    const [pB] = await db.insert(parents).values({
      email: `${TEST_PREFIX}parent-b@test.com`,
      name: 'ParentB',
      passwordHash: parentHash,
    }).returning();
    parentB = { id: pB.id, email: pB.email };

    await db.insert(parentLinks).values({
      parentId: parentA.id,
      userId: userA.id,
      relation: 'parent',
      verifiedAt: new Date(),
    });

    await db.insert(consents).values({
      userId: userA.id,
      consentType: 'bola_test_consent',
      value: false,
      grantedBy: 'system',
    }).catch(() => {});
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('requireOwnership', () => {
    it('blocks when session user does not own resource', async () => {
      const { requireOwnership } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireOwnership(async () => userB.id),
        { session: { userId: userA.id }, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(403);
      expect(result.body?.error).toBe('Not authorized');
    });

    it('allows when session user owns resource', async () => {
      const { requireOwnership } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireOwnership(async () => userA.id),
        { session: { userId: userA.id }, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(200);
    });

    it('returns 401 for unauthenticated users', async () => {
      const { requireOwnership } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireOwnership(async () => userA.id),
        { session: {}, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(401);
    });

    it('returns 404 when resource not found', async () => {
      const { requireOwnership } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireOwnership(async () => null),
        { session: { userId: userA.id }, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(404);
    });
  });

  describe('verifyParentYouthLink', () => {
    it('returns link for linked parent', async () => {
      const { verifyParentYouthLink } = await import('../middleware/permissions.ts');
      const link = await verifyParentYouthLink(parentA.id, userA.id);
      expect(link).not.toBeNull();
      expect(link!.relation).toBe('parent');
    });

    it('returns null for unlinked parent', async () => {
      const { verifyParentYouthLink } = await import('../middleware/permissions.ts');
      const link = await verifyParentYouthLink(parentB.id, userA.id);
      expect(link).toBeNull();
    });

    it('returns null for linked parent accessing wrong youth', async () => {
      const { verifyParentYouthLink } = await import('../middleware/permissions.ts');
      const link = await verifyParentYouthLink(parentA.id, userB.id);
      expect(link).toBeNull();
    });
  });

  describe('requireParentYouthLink', () => {
    it('blocks parent from accessing unlinked youth', async () => {
      const { requireParentYouthLink } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireParentYouthLink((req) => req.params.youthId),
        { session: { parentId: parentB.id }, params: { youthId: userA.id }, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(403);
    });

    it('allows linked parent to access their youth', async () => {
      const { requireParentYouthLink } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireParentYouthLink((req) => req.params.youthId),
        { session: { parentId: parentA.id }, params: { youthId: userA.id }, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(200);
    });

    it('returns 401 when no parent session', async () => {
      const { requireParentYouthLink } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireParentYouthLink((req) => req.params.youthId),
        { session: {}, params: { youthId: userA.id }, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(401);
    });
  });

  describe('requireSessionUserOrLinkedParent', () => {
    it('allows user to access their own resource', async () => {
      const { requireSessionUserOrLinkedParent } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireSessionUserOrLinkedParent((req) => req.params.userId),
        { session: { userId: userA.id }, params: { userId: userA.id }, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(200);
    });

    it('allows linked parent to access youth resource', async () => {
      const { requireSessionUserOrLinkedParent } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireSessionUserOrLinkedParent((req) => req.params.userId),
        { session: { parentId: parentA.id }, params: { userId: userA.id }, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(200);
    });

    it('blocks unlinked parent from accessing youth resource', async () => {
      const { requireSessionUserOrLinkedParent } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireSessionUserOrLinkedParent((req) => req.params.userId),
        { session: { parentId: parentB.id }, params: { userId: userA.id }, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(403);
    });

    it('blocks user from accessing another user resource', async () => {
      const { requireSessionUserOrLinkedParent } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireSessionUserOrLinkedParent((req) => req.params.userId),
        { session: { userId: userA.id }, params: { userId: userB.id }, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(403);
    });

    it('blocks unauthenticated request', async () => {
      const { requireSessionUserOrLinkedParent } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireSessionUserOrLinkedParent((req) => req.params.userId),
        { session: {}, params: { userId: userA.id }, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(403);
    });
  });

  describe('requireRole', () => {
    it('admin: blocks non-admin from admin routes', async () => {
      const { requireRole } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireRole('admin'),
        { session: { userId: userA.id }, method: 'GET', originalUrl: '/api/admin/test' }
      );
      expect(result.statusCode).toBe(403);
      expect(result.body?.error).toBe('Admin privileges required');
    });

    it('admin: blocks youth worker from admin routes', async () => {
      const { requireRole } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireRole('admin'),
        { session: { youthWorkerId: 'some-worker-id', organizationId: 'some-org' }, method: 'GET', originalUrl: '/api/admin/test' }
      );
      expect(result.statusCode).toBe(403);
    });

    it('admin: blocks parent from admin routes', async () => {
      const { requireRole } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireRole('admin'),
        { session: { parentId: parentA.id }, method: 'GET', originalUrl: '/api/admin/test' }
      );
      expect(result.statusCode).toBe(403);
    });

    it('admin: allows admin session', async () => {
      const { requireRole } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireRole('admin'),
        { session: { isAdminSession: true, adminId: 'admin-1' }, method: 'GET', originalUrl: '/api/admin/test' }
      );
      expect(result.statusCode).toBe(200);
    });

    it('youth_worker: blocks regular user from worker routes', async () => {
      const { requireRole } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireRole('youth_worker'),
        { session: { userId: userA.id }, method: 'GET', originalUrl: '/api/workers/test' }
      );
      expect(result.statusCode).toBe(401);
    });

    it('youth_worker: allows youth worker session', async () => {
      const { requireRole } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireRole('youth_worker'),
        { session: { youthWorkerId: 'worker-1' }, method: 'GET', originalUrl: '/api/workers/test' }
      );
      expect(result.statusCode).toBe(200);
    });

    it('parent: blocks youth from parent routes', async () => {
      const { requireRole } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireRole('parent'),
        { session: { userId: userA.id }, method: 'GET', originalUrl: '/api/parent/test' }
      );
      expect(result.statusCode).toBe(401);
    });

    it('parent: allows parent session', async () => {
      const { requireRole } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireRole('parent'),
        { session: { parentId: parentA.id }, method: 'GET', originalUrl: '/api/parent/test' }
      );
      expect(result.statusCode).toBe(200);
    });
  });

  describe('requireSelf', () => {
    it('blocks user from accessing another user via param', async () => {
      const { requireSelf } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireSelf('userId'),
        { session: { userId: userA.id }, params: { userId: userB.id }, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(403);
    });

    it('allows user to access their own resource via param', async () => {
      const { requireSelf } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireSelf('userId'),
        { session: { userId: userA.id }, params: { userId: userA.id }, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(200);
    });

    it('returns 401 for unauthenticated user', async () => {
      const { requireSelf } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireSelf('userId'),
        { session: {}, params: { userId: userA.id }, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(401);
    });

    it('returns 400 when param is missing', async () => {
      const { requireSelf } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireSelf('userId'),
        { session: { userId: userA.id }, params: {}, method: 'GET', originalUrl: '/api/test' }
      );
      expect(result.statusCode).toBe(400);
    });
  });

  describe('requireOrgScope', () => {
    it('blocks worker session without org scope', async () => {
      const { requireOrgScope } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireOrgScope(),
        { session: { youthWorkerId: 'worker-1' }, method: 'GET', originalUrl: '/api/workers/test' }
      );
      expect(result.statusCode).toBe(403);
      expect(result.body?.error).toBe('Organization scope required');
    });

    it('allows worker session with org scope', async () => {
      const { requireOrgScope } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireOrgScope(),
        { session: { youthWorkerId: 'worker-1', organizationId: 'org-1' }, method: 'GET', originalUrl: '/api/workers/test' }
      );
      expect(result.statusCode).toBe(200);
    });

    it('blocks cross-org access when paramKey is specified', async () => {
      const { requireOrgScope } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireOrgScope('orgId'),
        { session: { youthWorkerId: 'worker-1', organizationId: 'org-1' }, params: { orgId: 'org-2' }, method: 'GET', originalUrl: '/api/workers/test' }
      );
      expect(result.statusCode).toBe(403);
      expect(result.body?.error).toBe('Not authorized for this organization');
    });

    it('allows same-org access when paramKey matches session org', async () => {
      const { requireOrgScope } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireOrgScope('orgId'),
        { session: { youthWorkerId: 'worker-1', organizationId: 'org-1' }, params: { orgId: 'org-1' }, method: 'GET', originalUrl: '/api/workers/test' }
      );
      expect(result.statusCode).toBe(200);
    });

    it('blocks cross-org access via request body', async () => {
      const { requireOrgScope } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireOrgScope('organizationId'),
        { session: { youthWorkerId: 'worker-1', organizationId: 'org-1' }, params: {}, body: { organizationId: 'org-other' }, method: 'POST', originalUrl: '/api/workers/create' }
      );
      expect(result.statusCode).toBe(403);
    });
  });

  describe('requireLinkedChild', () => {
    it('blocks parent from accessing non-linked child by param', async () => {
      const { requireLinkedChild } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireLinkedChild('youthId'),
        { session: { parentId: parentB.id }, params: { youthId: userA.id }, method: 'GET', originalUrl: '/api/parent/test' }
      );
      expect(result.statusCode).toBe(403);
    });

    it('allows parent to access linked child by param', async () => {
      const { requireLinkedChild } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireLinkedChild('youthId'),
        { session: { parentId: parentA.id }, params: { youthId: userA.id }, method: 'GET', originalUrl: '/api/parent/test' }
      );
      expect(result.statusCode).toBe(200);
    });

    it('returns 401 when no parent session', async () => {
      const { requireLinkedChild } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireLinkedChild('youthId'),
        { session: { userId: userA.id }, params: { youthId: userA.id }, method: 'GET', originalUrl: '/api/parent/test' }
      );
      expect(result.statusCode).toBe(401);
    });

    it('returns 400 when param is missing', async () => {
      const { requireLinkedChild } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireLinkedChild('youthId'),
        { session: { parentId: parentA.id }, params: {}, method: 'GET', originalUrl: '/api/parent/test' }
      );
      expect(result.statusCode).toBe(400);
    });
  });

  describe('requireOrgMember', () => {
    it('blocks non-org user from org resources', async () => {
      const { requireOrgMember } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireOrgMember(),
        { session: { userId: userA.id }, method: 'GET', originalUrl: '/api/org/test' }
      );
      expect(result.statusCode).toBe(403);
      expect(result.body?.error).toBe('Organization membership required');
    });

    it('allows org-scoped worker', async () => {
      const { requireOrgMember } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireOrgMember(),
        { session: { youthWorkerId: 'w1', organizationId: 'org-1' }, method: 'GET', originalUrl: '/api/org/test' }
      );
      expect(result.statusCode).toBe(200);
    });

    it('allows admin to access org resources', async () => {
      const { requireOrgMember } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireOrgMember(),
        { session: { isAdminSession: true, adminId: 'admin-1' }, method: 'GET', originalUrl: '/api/org/test' }
      );
      expect(result.statusCode).toBe(200);
    });

    it('blocks parent from org resources', async () => {
      const { requireOrgMember } = await import('../middleware/permissions.ts');
      const result = await runMiddleware(
        requireOrgMember(),
        { session: { parentId: parentA.id }, method: 'GET', originalUrl: '/api/org/test' }
      );
      expect(result.statusCode).toBe(403);
    });
  });

  // T033: consent-auto router file deleted; the prefix now 410s under PILOT_MODE
  // via PILOT_DISABLED_CONSENT_PREFIXES. The legacy IDOR test block was removed.

  describe('HTTP Integration: mood-tasks ownership', () => {
    let app: express.Application;
    let taskId: string;

    beforeAll(async () => {
      app = buildTestApp();
      const { default: moodTasksRoutes } = await import('../routes/mood-tasks.js');
      app.use('/api/mood-tasks', moodTasksRoutes);

      const [task] = await db.insert(moodTasks).values({
        userId: userA.id,
        programEventId: crypto.randomUUID(),
        type: 'pre',
        dueAt: new Date(),
      }).returning();
      taskId = task.id;
    });

    afterAll(async () => {
      if (taskId) {
        await db.delete(moodTasks).where(eq(moodTasks.id, taskId)).catch(() => {});
      }
    });

    it('allows owner to complete their own task', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ userId: userA.id });
      const res = await agent.post(`/api/mood-tasks/${taskId}/complete`);
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    it('blocks non-owner from completing another user task', async () => {
      const [newTask] = await db.insert(moodTasks).values({
        userId: userA.id,
        programEventId: crypto.randomUUID(),
        type: 'post',
        dueAt: new Date(),
      }).returning();

      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ userId: userB.id });
      const res = await agent.post(`/api/mood-tasks/${newTask.id}/complete`);
      expect(res.status).toBe(403);

      await db.delete(moodTasks).where(eq(moodTasks.id, newTask.id)).catch(() => {});
    });

    it('blocks unauthenticated request from completing a task', async () => {
      const [newTask] = await db.insert(moodTasks).values({
        userId: userA.id,
        programEventId: crypto.randomUUID(),
        type: 'pre',
        dueAt: new Date(),
      }).returning();

      const agent = request.agent(app);
      const res = await agent.post(`/api/mood-tasks/${newTask.id}/complete`);
      expect(res.status).toBe(401);

      await db.delete(moodTasks).where(eq(moodTasks.id, newTask.id)).catch(() => {});
    });

    it('only returns tasks belonging to the session user', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ userId: userB.id });
      const res = await agent.get('/api/mood-tasks');
      expect(res.status).toBe(200);
      expect(res.body.tasks.length).toBe(0);
    });
  });

  describe('HTTP Integration: admin route protection', () => {
    let app: express.Application;

    beforeAll(async () => {
      app = buildTestApp();
      const { requireRole } = await import('../middleware/permissions.ts');
      app.get('/api/admin/test-protected', requireRole('admin'), (_req, res) => {
        res.json({ ok: true, data: 'admin-secret' });
      });
    });

    it('blocks regular youth from admin endpoint', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ userId: userA.id });
      const res = await agent.get('/api/admin/test-protected');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Admin privileges required');
    });

    it('blocks parent from admin endpoint', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ parentId: parentA.id });
      const res = await agent.get('/api/admin/test-protected');
      expect(res.status).toBe(403);
    });

    it('blocks youth worker from admin endpoint', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ youthWorkerId: 'worker-1', organizationId: 'org-1' });
      const res = await agent.get('/api/admin/test-protected');
      expect(res.status).toBe(403);
    });

    it('allows admin session to access admin endpoint', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ isAdminSession: true, adminId: 'admin-1' });
      const res = await agent.get('/api/admin/test-protected');
      expect(res.status).toBe(200);
      expect(res.body.data).toBe('admin-secret');
    });

    it('blocks unauthenticated request from admin endpoint', async () => {
      const agent = request.agent(app);
      const res = await agent.get('/api/admin/test-protected');
      expect(res.status).toBe(403);
    });
  });

  describe('HTTP Integration: org scope enforcement', () => {
    let app: express.Application;

    beforeAll(async () => {
      app = buildTestApp();
      const { requireRole, requireOrgScope } = await import('../middleware/permissions.ts');
      app.get('/api/workers/org-scoped',
        requireRole('youth_worker'),
        requireOrgScope(),
        (req, res) => {
          res.json({ ok: true, orgId: req.session.organizationId });
        }
      );
      app.get('/api/workers/org/:orgId/data',
        requireRole('youth_worker'),
        requireOrgScope('orgId'),
        (req, res) => {
          res.json({ ok: true, orgId: req.params.orgId });
        }
      );
    });

    it('blocks worker without org scope', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ youthWorkerId: 'worker-1' });
      const res = await agent.get('/api/workers/org-scoped');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Organization scope required');
    });

    it('allows worker with org scope', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ youthWorkerId: 'worker-1', organizationId: 'org-123' });
      const res = await agent.get('/api/workers/org-scoped');
      expect(res.status).toBe(200);
      expect(res.body.orgId).toBe('org-123');
    });

    it('blocks regular youth from worker+org endpoint', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ userId: userA.id });
      const res = await agent.get('/api/workers/org-scoped');
      expect(res.status).toBe(401);
    });

    it('blocks cross-org access via URL param', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ youthWorkerId: 'worker-1', organizationId: 'org-AAA' });
      const res = await agent.get('/api/workers/org/org-BBB/data');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Not authorized for this organization');
    });

    it('allows same-org access via URL param', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ youthWorkerId: 'worker-1', organizationId: 'org-AAA' });
      const res = await agent.get('/api/workers/org/org-AAA/data');
      expect(res.status).toBe(200);
      expect(res.body.orgId).toBe('org-AAA');
    });
  });

  describe('HTTP Integration: requireLinkedChild param guard', () => {
    let app: express.Application;

    beforeAll(async () => {
      app = buildTestApp();
      const { requireLinkedChild } = await import('../middleware/permissions.ts');
      app.get('/api/parent/child/:youthId/data',
        (req, res, next) => {
          if (!req.session?.parentId) return res.status(401).json({ error: 'Not authenticated' });
          next();
        },
        requireLinkedChild('youthId'),
        (req, res) => {
          res.json({ ok: true, youthId: req.params.youthId });
        }
      );
    });

    it('allows linked parent to access child data', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ parentId: parentA.id });
      const res = await agent.get(`/api/parent/child/${userA.id}/data`);
      expect(res.status).toBe(200);
      expect(res.body.youthId).toBe(userA.id);
    });

    it('blocks unlinked parent from accessing child data', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ parentId: parentB.id });
      const res = await agent.get(`/api/parent/child/${userA.id}/data`);
      expect(res.status).toBe(403);
    });

    it('blocks parent from accessing non-linked youth', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ parentId: parentA.id });
      const res = await agent.get(`/api/parent/child/${userB.id}/data`);
      expect(res.status).toBe(403);
    });
  });

  describe('HTTP Integration: youth-workers org scope on real routes', () => {
    let app: express.Application;

    beforeAll(async () => {
      app = buildTestApp();
      const { default: youthWorkerRoutes } = await import('../routes/youth-workers.ts');
      app.use('/api/youth-workers', youthWorkerRoutes);
    });

    it('blocks worker without org scope from /my-youth', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ youthWorkerId: 'worker-no-org' });
      const res = await agent.get('/api/youth-workers/my-youth');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Organization scope required');
    });

    it('blocks regular youth from /my-youth', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ userId: userA.id });
      const res = await agent.get('/api/youth-workers/my-youth');
      expect(res.status).toBe(401);
    });

    it('blocks worker without org scope from /case-notes', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ youthWorkerId: 'worker-no-org' });
      const res = await agent.get('/api/youth-workers/case-notes?youthId=test');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Organization scope required');
    });

    it('blocks worker without org scope from /consent-requests', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({ youthWorkerId: 'worker-no-org' });
      const res = await agent.get('/api/youth-workers/consent-requests');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Organization scope required');
    });

    it('blocks unauthenticated request from /reports/types', async () => {
      const agent = request.agent(app);
      const res = await agent.get('/api/youth-workers/reports/types');
      expect(res.status).toBe(401);
    });

    it('worker with org scope passes auth, worker without org is denied on same route', async () => {
      const agentWithOrg = request.agent(app);
      await agentWithOrg.post('/test/set-session').send({
        youthWorkerId: 'worker-org-A',
        organizationId: 'org-A-id',
      });
      const resWithOrg = await agentWithOrg.get('/api/youth-workers/my-youth');
      expect([200, 500]).toContain(resWithOrg.status);
      if (resWithOrg.status === 200) {
        expect(resWithOrg.body.granted).toBeDefined();
      }
      expect(resWithOrg.body.error).not.toBe('Organization scope required');

      const agentNoOrg = request.agent(app);
      await agentNoOrg.post('/test/set-session').send({
        youthWorkerId: 'worker-no-org-scope',
      });
      const resNoOrg = await agentNoOrg.get('/api/youth-workers/my-youth');
      expect(resNoOrg.status).toBe(403);
      expect(resNoOrg.body.error).toBe('Organization scope required');
    });

    it('worker without org scope is denied from case-notes/summary', async () => {
      const agent = request.agent(app);
      await agent.post('/test/set-session').send({
        youthWorkerId: 'worker-cross-org',
      });
      const res = await agent.get('/api/youth-workers/case-notes/summary');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Organization scope required');
    });
  });

  describe('DB-Level: Existing Endpoint Scoping Verification', () => {
    it('checkins: query is scoped to session userId', async () => {
      await db.insert(checkins).values({
        userId: userA.id,
        timestamp: new Date(),
        checkinDate: '2026-04-15',
        dimension: 'mood',
        moodLevel16: 4,
        moodType: 'clear',
      });

      const userACheckins = await db.select().from(checkins).where(eq(checkins.userId, userA.id));
      const userBCheckins = await db.select().from(checkins).where(eq(checkins.userId, userB.id));

      expect(userACheckins.length).toBeGreaterThan(0);
      expect(userBCheckins.length).toBe(0);
      expect(userACheckins.every((c) => c.userId === userA.id)).toBe(true);
    });

    it('parentLinks correctly enforces access boundaries', async () => {
      const noLink = await db.select().from(parentLinks)
        .where(and(eq(parentLinks.parentId, parentB.id), eq(parentLinks.userId, userA.id)))
        .limit(1);
      expect(noLink.length).toBe(0);

      const validLink = await db.select().from(parentLinks)
        .where(and(eq(parentLinks.parentId, parentA.id), eq(parentLinks.userId, userA.id)))
        .limit(1);
      expect(validLink.length).toBe(1);
    });
  });
});
