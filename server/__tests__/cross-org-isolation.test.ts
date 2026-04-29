/**
 * Audit C11 / M3 — Cross-org isolation regression test (Task #40 subtask 2).
 *
 * Scenario: a youth-worker holds a granted assignment to a youth that was
 * created while the worker belonged to OrgB. The worker is then moved to
 * OrgA. With session.organizationId = OrgA, the worker MUST NOT be able
 * to reach the youth's data through any /youth/:youthId/* handler — even
 * though the (worker, youth) tuple still exists in youth_worker_assignments
 * with consent_status = 'granted'.
 *
 * Pre-fix the assignment lookups only filtered by (youthWorkerId, youthId,
 * consentStatus). A worker who moved orgs would carry their old assignments
 * across org boundaries. The fix snapshots organization_id onto the
 * assignment row and adds an `eq(organizationId, sessionOrgId)` clause to
 * every :youthId lookup.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
import { db } from '../db.js';
import { users, profiles, organizations } from '../schema.js';
import {
  youthWorkers,
  youthWorkerAssignments,
} from '../schema-extensions.ts';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

const TEST_PREFIX = 'cross-org-iso-';

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'cross-org-iso-test-secret',
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

describe('Cross-org isolation on youth-worker :youthId routes', () => {
  let orgA: { id: string };
  let orgB: { id: string };
  let worker: { id: string };
  let youthInOrgB: { id: string };
  let app: ReturnType<typeof buildTestApp>;
  let agent: ReturnType<typeof request.agent>;

  async function cleanup() {
    const [w] = await db.select().from(youthWorkers)
      .where(eq(youthWorkers.email, `${TEST_PREFIX}worker@test.com`)).limit(1);
    if (w) {
      await db.delete(youthWorkerAssignments)
        .where(eq(youthWorkerAssignments.youthWorkerId, w.id)).catch(() => {});
      await db.delete(youthWorkers).where(eq(youthWorkers.id, w.id)).catch(() => {});
    }
    const [u] = await db.select().from(users)
      .where(eq(users.email, `${TEST_PREFIX}youth@test.com`)).limit(1);
    if (u) {
      await db.delete(profiles).where(eq(profiles.userId, u.id)).catch(() => {});
      await db.delete(users).where(eq(users.id, u.id)).catch(() => {});
    }
    for (const name of [`${TEST_PREFIX}OrgA`, `${TEST_PREFIX}OrgB`]) {
      const [o] = await db.select().from(organizations)
        .where(eq(organizations.name, name)).limit(1);
      if (o) await db.delete(organizations).where(eq(organizations.id, o.id)).catch(() => {});
    }
  }

  beforeAll(async () => {
    await cleanup();

    const [a] = await db.insert(organizations).values({
      name: `${TEST_PREFIX}OrgA`, type: 'youth_org', active: true,
    }).returning();
    orgA = { id: a.id };

    const [b] = await db.insert(organizations).values({
      name: `${TEST_PREFIX}OrgB`, type: 'youth_org', active: true,
    }).returning();
    orgB = { id: b.id };

    // Worker is currently in OrgB (we'll "move" them to OrgA below).
    const [w] = await db.insert(youthWorkers).values({
      organizationId: orgB.id,
      email: `${TEST_PREFIX}worker@test.com`,
      passwordHash: await bcrypt.hash('TestPass123!', 4),
      firstName: 'Cross', lastName: 'OrgWorker',
      role: 'worker',
      active: true,
    }).returning();
    worker = { id: w.id };

    // Youth that the worker had legitimate access to while in OrgB.
    const [u] = await db.insert(users).values({
      email: `${TEST_PREFIX}youth@test.com`,
      passwordHash: await bcrypt.hash('TestPass123!', 4),
      isMinor: false,
    }).returning();
    youthInOrgB = { id: u.id };
    await db.insert(profiles).values({
      userId: youthInOrgB.id,
      firstName: 'CrossYouth',
    });

    // Assignment created while worker was in OrgB — granted access.
    await db.insert(youthWorkerAssignments).values({
      youthWorkerId: worker.id,
      youthId: youthInOrgB.id,
      organizationId: orgB.id,
      consentStatus: 'granted',
      consentLevel: {
        share_mood_timeline: true,
        share_program_engagement: true,
        share_checkin_streak: true,
      },
      respondedAt: new Date(),
    });

    // Worker moves to OrgA. Their existing OrgB assignment row stays
    // (this models the real-world "move" — assignments are NOT cascaded
    // because we want the next-paragraph defense to actually fire).
    await db.update(youthWorkers)
      .set({ organizationId: orgA.id })
      .where(eq(youthWorkers.id, worker.id));

    app = buildTestApp();
    const youthWorkersRouter = (await import('../routes/youth-workers.ts')).default;
    app.use('/api/youth-workers', youthWorkersRouter);

    agent = request.agent(app);
    // Session reflects the worker AFTER the move — they're now in OrgA.
    // csrfToken is seeded so the POST /assign reassign test below can
    // pass validateCsrfToken with a header.
    await agent.post('/test/set-session').send({
      youthWorkerId: worker.id,
      organizationId: orgA.id,
      isYouthWorkerSession: true,
      youthWorkerRole: 'worker',
      csrfToken: 'cross-org-iso-csrf',
    });
  });

  afterAll(async () => {
    await cleanup();
  });

  const blockedRoutes = [
    `/api/youth-workers/youth/${'PLACEHOLDER'}/dashboard`,
    `/api/youth-workers/youth/${'PLACEHOLDER'}`,
    `/api/youth-workers/youth/${'PLACEHOLDER'}/mood-history`,
    `/api/youth-workers/youth/${'PLACEHOLDER'}/schedule`,
  ];

  for (const tmpl of blockedRoutes) {
    it(`blocks GET ${tmpl} with 403 because the granted assignment lives in a different org`, async () => {
      const path = tmpl.replace('PLACEHOLDER', youthInOrgB.id);
      const res = await agent.get(path);
      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/access denied/i);
    });
  }

  it('omits the OrgB-pinned youth from /my-youth even though the granted assignment row still exists', async () => {
    const res = await agent.get('/api/youth-workers/my-youth');
    expect(res.status).toBe(200);
    // /my-youth returns { granted: [...], pending: [...] } — both must be empty.
    const granted = (res.body.granted || []) as Array<{ youthId: string }>;
    const pending = (res.body.pending || []) as Array<{ youthId: string }>;
    expect(granted.find((a) => a.youthId === youthInOrgB.id)).toBeUndefined();
    expect(pending.find((a) => a.youthId === youthInOrgB.id)).toBeUndefined();
  });

  it('omits the OrgB-pinned assignment from GET /consent-requests', async () => {
    const res = await agent.get('/api/youth-workers/consent-requests');
    expect(res.status).toBe(200);
    const list = res.body as Array<{ youthId: string }>;
    const ours = list.find((a) => a.youthId === youthInOrgB.id);
    expect(ours).toBeUndefined();
  });

  it('blocks GET /case-notes?youthId= for the OrgB youth with 403', async () => {
    const res = await agent.get(`/api/youth-workers/case-notes?youthId=${youthInOrgB.id}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  it('blocks GET /case-notes/summary?youthId= for the OrgB youth with 403', async () => {
    const res = await agent.get(
      `/api/youth-workers/case-notes/summary?youthId=${youthInOrgB.id}`,
    );
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/no granted assignment/i);
  });

  it('allows POST /assign for the same youth in the new org (DB unique index must be (worker, youth, org), not (worker, youth))', async () => {
    // This is the regression test for the index-swap fix.
    // Pre-fix: app-level dedup filtered by org and would let the request
    // through, but the DB unique index on (youth_worker_id, youth_id)
    // would 23505 on insert → 500. After widening the index to include
    // organization_id, the worker-in-OrgA can re-assign to the same
    // youth without colliding with the OrgB row.
    const res = await agent
      .post('/api/youth-workers/assign')
      .set('x-csrf-token', 'cross-org-iso-csrf')
      .send({ youthEmail: `${TEST_PREFIX}youth@test.com` });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTruthy();

    // Verify both rows now exist: original OrgB (granted) + new OrgA (pending).
    const rows = await db.select()
      .from(youthWorkerAssignments)
      .where(eq(youthWorkerAssignments.youthWorkerId, worker.id));
    expect(rows.length).toBe(2);
    const byOrg = Object.fromEntries(rows.map((r) => [r.organizationId, r]));
    expect(byOrg[orgA.id]?.consentStatus).toBe('pending');
    expect(byOrg[orgB.id]?.consentStatus).toBe('granted');
  });

  it('confirms the OrgB-pinned assignment row still exists and is granted (so the only thing blocking access is the org filter)', async () => {
    // Filter explicitly by organizationId — after the reassign test
    // above runs, two rows exist for (worker, youth): one in OrgB
    // (granted) and one in OrgA (pending). Without the org filter,
    // limit(1) would be non-deterministic across run orders.
    const [assignment] = await db.select()
      .from(youthWorkerAssignments)
      .where(and(
        eq(youthWorkerAssignments.youthWorkerId, worker.id),
        eq(youthWorkerAssignments.organizationId, orgB.id),
      ))
      .limit(1);
    expect(assignment).toBeTruthy();
    expect(assignment.consentStatus).toBe('granted');
    expect(assignment.organizationId).toBe(orgB.id);
    expect(assignment.youthId).toBe(youthInOrgB.id);
  });
});
