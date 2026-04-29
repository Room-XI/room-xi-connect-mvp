import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../db.js';
import { users, profiles, programs, programEvents } from '../schema.js';
import {
  parents,
  parentLinks,
  consentTemplates,
  consentRequests,
  consentReceipts,
  consentAuditEvents,
  eventRsvps,
} from '../schema.extras.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import express from 'express';
import session from 'express-session';
import request from 'supertest';
// Audit C13 (Task #40 subtask 3): test setup must respect canonical
// consent engine invariants — direct INSERTs into consent_requests
// bypass uniqueness, audit-event creation, and template checks.
import {
  findOrCreateConsentRequest,
  signConsentRequest,
} from '../pilot/consent/consentEngine.ts';

const TEST_PREFIX = 'consent-rsvp-test-';

interface AuditMetadata {
  trigger?: string;
  eventId?: string;
  programId?: string;
  parentId?: string;
  cancelledRsvpCount?: number;
  cancelledRsvpIds?: string[];
  reason?: string;
}

function parseMetadata(raw: unknown): AuditMetadata {
  if (raw && typeof raw === 'object') {
    return raw as AuditMetadata;
  }
  return {};
}

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'consent-rsvp-test-secret',
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

describe('Consent-RSVP Integration Tests', () => {
  let youthMinor: { id: string };
  let youthAdult: { id: string };
  let parentUser: { id: string; email: string };
  let testProgram: { id: string };
  let testEvent: { id: string };
  let programTemplate: { id: string };
  let app: ReturnType<typeof buildTestApp>;
  let agent: ReturnType<typeof request.agent>;

  async function cleanupTestData() {
    const testEmails = [
      `${TEST_PREFIX}minor@test.com`,
      `${TEST_PREFIX}adult@test.com`,
    ];
    const parentEmails = [
      `${TEST_PREFIX}parent@test.com`,
    ];

    for (const email of testEmails) {
      const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (u) {
        await db.delete(eventRsvps).where(eq(eventRsvps.userId, u.id)).catch(() => {});
        await db.delete(profiles).where(eq(profiles.userId, u.id)).catch(() => {});
        await db.delete(parentLinks).where(eq(parentLinks.userId, u.id)).catch(() => {});
        await db.delete(users).where(eq(users.id, u.id)).catch(() => {});
      }
    }
    for (const email of parentEmails) {
      const [p] = await db.select().from(parents).where(eq(parents.email, email)).limit(1);
      if (p) {
        const reqs = await db.select().from(consentRequests).where(eq(consentRequests.parentId, p.id));
        for (const r of reqs) {
          await db.delete(consentAuditEvents).where(eq(consentAuditEvents.requestId, r.id)).catch(() => {});
          await db.delete(consentReceipts).where(eq(consentReceipts.requestId, r.id)).catch(() => {});
        }
        await db.delete(consentRequests).where(eq(consentRequests.parentId, p.id)).catch(() => {});
        await db.delete(parentLinks).where(eq(parentLinks.parentId, p.id)).catch(() => {});
        await db.delete(parents).where(eq(parents.id, p.id)).catch(() => {});
      }
    }

    const [prog] = await db.select().from(programs)
      .where(eq(programs.title, `${TEST_PREFIX}Program`)).limit(1);
    if (prog) {
      await db.delete(eventRsvps).where(eq(eventRsvps.programId, prog.id)).catch(() => {});
      await db.delete(programEvents).where(eq(programEvents.programId, prog.id)).catch(() => {});
      await db.delete(programs).where(eq(programs.id, prog.id)).catch(() => {});
    }

    await db.delete(consentTemplates)
      .where(eq(consentTemplates.name, `${TEST_PREFIX}Program Consent`)).catch(() => {});
  }

  beforeAll(async () => {
    await cleanupTestData();

    const passwordHash = await bcrypt.hash('TestPass123!', 12);

    const [minor] = await db.insert(users).values({
      email: `${TEST_PREFIX}minor@test.com`,
      passwordHash,
      isMinor: true,
    }).returning();
    youthMinor = { id: minor.id };

    await db.insert(profiles).values({
      userId: youthMinor.id,
      firstName: 'TestMinor',
      preferredName: 'MinorKid',
      age: 15,
    });

    const [adult] = await db.insert(users).values({
      email: `${TEST_PREFIX}adult@test.com`,
      passwordHash,
      isMinor: false,
    }).returning();
    youthAdult = { id: adult.id };

    await db.insert(profiles).values({
      userId: youthAdult.id,
      firstName: 'TestAdult',
      age: 19,
    });

    const [parent] = await db.insert(parents).values({
      email: `${TEST_PREFIX}parent@test.com`,
      name: 'TestParent',
      passwordHash,
    }).returning();
    parentUser = { id: parent.id, email: parent.email };

    await db.insert(parentLinks).values({
      parentId: parentUser.id,
      userId: youthMinor.id,
      relation: 'parent',
      verifiedAt: new Date(),
    });

    const [prog] = await db.insert(programs).values({
      title: `${TEST_PREFIX}Program`,
      organizer: 'Test Org',
    }).returning();
    testProgram = { id: prog.id };

    const [evt] = await db.insert(programEvents).values({
      programId: testProgram.id,
      eventName: `${TEST_PREFIX}Event`,
      dayOfWeek: 'Monday',
      startTime: '10:00',
      endTime: '11:00',
      active: true,
    }).returning();
    testEvent = { id: evt.id };

    const [tmpl] = await db.insert(consentTemplates).values({
      name: `${TEST_PREFIX}Program Consent`,
      description: 'Test program consent template',
      consentType: 'program',
      bodyText: 'I consent to my child participating in this program.',
      active: true,
    }).returning();
    programTemplate = { id: tmpl.id };

    app = buildTestApp();

    const consentWalletRouter = (await import('../routes/consent-wallet.ts')).default;
    const eventRsvpsRouter = (await import('../routes/event-rsvps.ts')).default;
    app.use('/api/consent-wallet', consentWalletRouter);
    app.use('/api/event-rsvps', eventRsvpsRouter);
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  describe('RSVP creates consent request for minors', () => {
    it('should create RSVP with pending_consent for minor with linked parent', async () => {
      agent = request.agent(app);
      await agent.post('/test/set-session').send({ userId: youthMinor.id });

      const res = await agent.post('/api/event-rsvps').send({ eventId: testEvent.id });

      expect(res.status).toBe(201);
      expect(res.body.rsvp.status).toBe('pending_consent');
      expect(res.body.rsvp.consentRequestId).toBeTruthy();

      const [cr] = await db.select()
        .from(consentRequests)
        .where(eq(consentRequests.id, res.body.rsvp.consentRequestId))
        .limit(1);
      expect(cr).toBeTruthy();
      expect(cr.status).toBe('pending');
      expect(cr.youthId).toBe(youthMinor.id);
      expect(cr.parentId).toBe(parentUser.id);
      expect(cr.programId).toBe(testProgram.id);

      const auditEvents = await db.select()
        .from(consentAuditEvents)
        .where(eq(consentAuditEvents.requestId, cr.id));
      expect(auditEvents.length).toBeGreaterThanOrEqual(1);
      const autoCreated = auditEvents.find(e => e.action === 'request_auto_created');
      expect(autoCreated).toBeTruthy();
      const meta = parseMetadata(autoCreated!.metadata);
      expect(meta.trigger).toBe('event_rsvp');
    });

    it('should create RSVP with confirmed for non-minor', async () => {
      agent = request.agent(app);
      await agent.post('/test/set-session').send({ userId: youthAdult.id });

      const res = await agent.post('/api/event-rsvps').send({ eventId: testEvent.id });

      expect(res.status).toBe(201);
      expect(res.body.rsvp.status).toBe('confirmed');
      expect(res.body.rsvp.consentRequestId).toBeNull();
    });
  });

  describe('Parent sign upgrades pending_consent RSVPs', () => {
    it('should upgrade pending_consent RSVP to confirmed when parent signs', async () => {
      const minorRsvps = await db.select()
        .from(eventRsvps)
        .where(and(
          eq(eventRsvps.userId, youthMinor.id),
          eq(eventRsvps.status, 'pending_consent')
        ));
      expect(minorRsvps.length).toBe(1);
      const rsvp = minorRsvps[0];
      const consentRequestId = rsvp.consentRequestId!;

      agent = request.agent(app);
      await agent.post('/test/set-session').send({ parentId: parentUser.id });

      const signRes = await agent
        .post(`/api/consent-wallet/requests/${consentRequestId}/sign`)
        .send({ signature: 'I agree' });

      expect(signRes.status).toBe(200);
      expect(signRes.body.ok).toBe(true);

      const [updatedCr] = await db.select()
        .from(consentRequests)
        .where(eq(consentRequests.id, consentRequestId))
        .limit(1);
      expect(updatedCr.status).toBe('signed');

      const [updatedRsvp] = await db.select()
        .from(eventRsvps)
        .where(eq(eventRsvps.id, rsvp.id))
        .limit(1);
      expect(updatedRsvp.status).toBe('confirmed');

      const receipts = await db.select()
        .from(consentReceipts)
        .where(eq(consentReceipts.requestId, consentRequestId));
      expect(receipts.length).toBe(1);
      expect(receipts[0].signedBy).toBe(parentUser.id);
      expect(receipts[0].signature).toBe('I agree');

      const auditEvents = await db.select()
        .from(consentAuditEvents)
        .where(eq(consentAuditEvents.requestId, consentRequestId));
      const signEvent = auditEvents.find(e => e.action === 'request_signed');
      expect(signEvent).toBeTruthy();
    });
  });

  describe('Parent withdraw cascades to RSVPs', () => {
    it('should cancel confirmed RSVPs when parent withdraws consent', async () => {
      const confirmedRsvps = await db.select()
        .from(eventRsvps)
        .where(and(
          eq(eventRsvps.userId, youthMinor.id),
          eq(eventRsvps.status, 'confirmed')
        ));
      expect(confirmedRsvps.length).toBeGreaterThanOrEqual(1);
      const rsvp = confirmedRsvps[0];
      const consentRequestId = rsvp.consentRequestId!;

      agent = request.agent(app);
      await agent.post('/test/set-session').send({ parentId: parentUser.id });

      const withdrawRes = await agent
        .post(`/api/consent-wallet/requests/${consentRequestId}/withdraw`)
        .send({ reason: 'Changed my mind' });

      expect(withdrawRes.status).toBe(200);
      expect(withdrawRes.body.ok).toBe(true);

      const [updatedCr] = await db.select()
        .from(consentRequests)
        .where(eq(consentRequests.id, consentRequestId))
        .limit(1);
      expect(updatedCr.status).toBe('withdrawn');

      const [updatedRsvp] = await db.select()
        .from(eventRsvps)
        .where(eq(eventRsvps.id, rsvp.id))
        .limit(1);
      expect(updatedRsvp.status).toBe('blocked');
      expect(updatedRsvp.cancelReason).toBe('Parent consent withdrawn');

      const receipts = await db.select()
        .from(consentReceipts)
        .where(eq(consentReceipts.requestId, consentRequestId));
      expect(receipts.length).toBe(1);
      expect(receipts[0].withdrawnAt).toBeTruthy();

      const auditEvents = await db.select()
        .from(consentAuditEvents)
        .where(eq(consentAuditEvents.requestId, consentRequestId));
      const withdrawEvent = auditEvents.find(e => e.action === 'consent_withdrawn');
      expect(withdrawEvent).toBeTruthy();
      const meta = parseMetadata(withdrawEvent!.metadata);
      expect(meta.cancelledRsvpCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Sign-first-then-RSVP withdraw cascade', () => {
    it('should cancel confirmed RSVP created after consent was already signed', async () => {
      await db.delete(eventRsvps).where(
        and(eq(eventRsvps.userId, youthMinor.id), eq(eventRsvps.eventId, testEvent.id))
      ).catch(() => {});

      // Use the engine — pending request first, then sign — instead of
      // a raw INSERT, so we exercise the same code path the routes use.
      const created = await findOrCreateConsentRequest(null, {
        youthId: youthMinor.id,
        parentId: parentUser.id,
        programId: testProgram.id,
        source: 'event_rsvp',
        actorId: youthMinor.id,
        actorType: 'youth',
      });
      await signConsentRequest({
        requestId: created.id,
        parentId: parentUser.id,
        signature: 'Pre-signed',
      });
      const [signedCr] = await db.select()
        .from(consentRequests)
        .where(eq(consentRequests.id, created.id))
        .limit(1);

      agent = request.agent(app);
      await agent.post('/test/set-session').send({ userId: youthMinor.id });

      const rsvpRes = await agent.post('/api/event-rsvps').send({ eventId: testEvent.id });
      expect(rsvpRes.status).toBe(201);
      expect(rsvpRes.body.rsvp.status).toBe('confirmed');
      expect(rsvpRes.body.rsvp.consentRequestId).toBe(signedCr.id);

      const rsvpId = rsvpRes.body.rsvp.id;

      agent = request.agent(app);
      await agent.post('/test/set-session').send({ parentId: parentUser.id });

      const withdrawRes = await agent
        .post(`/api/consent-wallet/requests/${signedCr.id}/withdraw`)
        .send({ reason: 'Reconsidering' });

      expect(withdrawRes.status).toBe(200);

      const [updatedRsvp] = await db.select()
        .from(eventRsvps)
        .where(eq(eventRsvps.id, rsvpId))
        .limit(1);
      expect(updatedRsvp.status).toBe('blocked');
      expect(updatedRsvp.cancelReason).toBe('Parent consent withdrawn');

      await db.delete(eventRsvps).where(eq(eventRsvps.id, rsvpId)).catch(() => {});
      await db.delete(consentAuditEvents).where(eq(consentAuditEvents.requestId, signedCr.id)).catch(() => {});
      await db.delete(consentReceipts).where(eq(consentReceipts.requestId, signedCr.id)).catch(() => {});
      await db.delete(consentRequests).where(eq(consentRequests.id, signedCr.id)).catch(() => {});
    });
  });

  describe('Parent decline cascades to pending RSVPs', () => {
    let newConsentRequestId: string;
    let newRsvpId: string;

    it('should setup a new pending_consent RSVP for decline test', async () => {
      await db.delete(eventRsvps).where(
        and(eq(eventRsvps.userId, youthMinor.id), eq(eventRsvps.eventId, testEvent.id))
      ).catch(() => {});

      // Audit C13: route through the canonical engine instead of a raw INSERT.
      const cr = await findOrCreateConsentRequest(null, {
        youthId: youthMinor.id,
        parentId: parentUser.id,
        programId: testProgram.id,
        source: 'event_rsvp',
        actorId: youthMinor.id,
        actorType: 'youth',
      });
      newConsentRequestId = cr.id;

      const [rsvp] = await db.insert(eventRsvps).values({
        userId: youthMinor.id,
        eventId: testEvent.id,
        programId: testProgram.id,
        status: 'pending_consent',
        consentRequestId: newConsentRequestId,
      }).returning();
      newRsvpId = rsvp.id;
    });

    it('should cancel pending_consent RSVP when parent declines', async () => {
      agent = request.agent(app);
      await agent.post('/test/set-session').send({ parentId: parentUser.id });

      const declineRes = await agent
        .post(`/api/consent-wallet/requests/${newConsentRequestId}/decline`)
        .send({ reason: 'Not appropriate' });

      expect(declineRes.status).toBe(200);
      expect(declineRes.body.ok).toBe(true);

      const [updatedCr] = await db.select()
        .from(consentRequests)
        .where(eq(consentRequests.id, newConsentRequestId))
        .limit(1);
      expect(updatedCr.status).toBe('declined');

      const [updatedRsvp] = await db.select()
        .from(eventRsvps)
        .where(eq(eventRsvps.id, newRsvpId))
        .limit(1);
      expect(updatedRsvp.status).toBe('blocked');
      expect(updatedRsvp.cancelReason).toBe('Parent consent declined');

      const auditEvents = await db.select()
        .from(consentAuditEvents)
        .where(eq(consentAuditEvents.requestId, newConsentRequestId));
      const declineEvent = auditEvents.find(e => e.action === 'request_declined');
      expect(declineEvent).toBeTruthy();
      const meta = parseMetadata(declineEvent!.metadata);
      expect(meta.cancelledRsvpCount).toBe(1);
    });
  });

  describe('Canonical consent engine lock', () => {
    it('requireConsent() throws if called with non-legacy consent types', async () => {
      const { requireConsent } = await import('../middleware/consent.ts');

      expect(() => requireConsent('program')).toThrow(
        /must only be used for legal\/signup consent types/
      );
      expect(() => requireConsent('program_participation')).toThrow(
        /must only be used for legal\/signup consent types/
      );
      expect(() => requireConsent(['terms_of_use', 'program'])).toThrow(
        /must only be used for legal\/signup consent types/
      );
    });

    it('requireConsent() accepts only valid legacy types', async () => {
      const { requireConsent } = await import('../middleware/consent.ts');

      expect(() => requireConsent('terms_of_use')).not.toThrow();
      expect(() => requireConsent('privacy_notice')).not.toThrow();
      expect(() => requireConsent('data_collection')).not.toThrow();
      expect(() => requireConsent('ai_personalization')).not.toThrow();
      expect(() => requireConsent(['terms_of_use', 'privacy_notice'])).not.toThrow();
    });

    it('requireProgramConsent() middleware checks canonical consent_requests table', async () => {
      const { requireProgramConsent } = await import('../middleware/consent.ts');

      const middleware = requireProgramConsent();
      expect(typeof middleware).toBe('function');

      const nonExistentProgramId = '00000000-0000-0000-0000-000000000099';
      const mockReq = {
        session: { userId: youthMinor.id },
        params: { programId: nonExistentProgramId },
        body: {},
      };
      const result = await new Promise<{ statusCode: number; body?: Record<string, unknown> }>((resolve) => {
        const res = {
          status: (code: number) => ({
            json: (body: Record<string, unknown>) => {
              resolve({ statusCode: code, body });
              return res;
            },
          }),
        };
        middleware(
          mockReq as unknown as import('express').Request,
          res as unknown as import('express').Response,
          () => resolve({ statusCode: 200 })
        );
      });

      expect(result.statusCode).toBe(403);
      expect(result.body?.code).toBe('PROGRAM_CONSENT_REQUIRED');
    });
  });

  describe('Consent engine concurrent idempotency (T007 — C4 full cutover)', () => {
    it('two concurrent findOrCreateConsentRequest calls for the same (youth, parent, program) return the SAME id (no 23505 leak)', async () => {
      // T007 promise: even when two RSVP/referral flows race to create
      // a consent_request for the same tuple, the unique partial index
      // catches the duplicate and the engine re-SELECTs the winner.
      // No 500 should ever leak to the caller.
      const { findOrCreateConsentRequest } = await import('../pilot/consent/consentEngine.ts');

      // Make sure no open request exists for the test tuple so this is
      // a true "two creators racing" scenario, not "both find existing".
      await db.delete(consentRequests)
        .where(and(
          eq(consentRequests.youthId, youthMinor.id),
          eq(consentRequests.parentId, parentUser.id),
        ))
        .catch(() => {});

      const params = {
        youthId: youthMinor.id,
        parentId: parentUser.id,
        programId: testProgram.id,
        source: 'event_rsvp' as const,
        actorId: youthMinor.id,
        actorType: 'youth' as const,
        sourceMetadata: { test: 'concurrent' },
      };

      const [a, b] = await Promise.all([
        findOrCreateConsentRequest(null, params),
        findOrCreateConsentRequest(null, params),
      ]);

      expect(a.id).toBeTruthy();
      expect(b.id).toBeTruthy();
      expect(a.id).toBe(b.id);
      // Exactly one of them created the row; the other found it (either
      // via the SELECT-first path or the unique-violation re-select).
      expect([a.created, b.created].filter(Boolean).length).toBe(1);
    });
  });

  describe('Consent engine idempotency (T002 — C4 lite cutover)', () => {
    it('findOrCreateConsentRequest returns the SAME request id on repeated calls for the same (youth, parent, program)', async () => {
      const { findOrCreateConsentRequest } = await import('../pilot/consent/consentEngine.ts');

      const first = await findOrCreateConsentRequest(null, {
        youthId: youthMinor.id,
        parentId: parentUser.id,
        programId: testProgram.id,
        source: 'event_rsvp',
        actorId: youthMinor.id,
        actorType: 'youth',
        sourceMetadata: { test: 'first' },
      });
      expect(first.id).toBeTruthy();

      const second = await findOrCreateConsentRequest(null, {
        youthId: youthMinor.id,
        parentId: parentUser.id,
        programId: testProgram.id,
        source: 'referral_accept',
        actorId: youthMinor.id,
        actorType: 'youth',
        sourceMetadata: { test: 'second' },
      });

      // The whole point of the helper: same (youth, parent, program) →
      // same consent_request row, regardless of which call site fired it.
      expect(second.id).toBe(first.id);
      expect(second.created).toBe(false);

      // Audit trail still records both attempts? No — only the first
      // attempt creates a request_auto_created event, because the second
      // call short-circuits on the existing row. That's correct: we only
      // want one "creation" event per request.
      const auditEvents = await db.select()
        .from(consentAuditEvents)
        .where(and(
          eq(consentAuditEvents.requestId, first.id),
          eq(consentAuditEvents.action, 'request_auto_created'),
        ));
      expect(auditEvents.length).toBe(1);
    });
  });
});
