import { describe, it, expect } from 'vitest';
import express from 'express';
import session from 'express-session';
import request from 'supertest';

function buildParentTestApp() {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'parent-forbidden-test',
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

describe('Parent Portal Forbidden Fields (pilotDataGate)', () => {
  let app: ReturnType<typeof buildParentTestApp>;
  let agent: ReturnType<typeof request.agent>;

  const FAKE_YOUTH_ID = '00000000-0000-0000-0000-000000000001';
  const FAKE_PARENT_ID = '00000000-0000-0000-0000-000000000099';

  it('setup: mount parent portal routes and set parent session', async () => {
    app = buildParentTestApp();
    const parentPortal = (await import('../routes/parent-portal.js')).default;
    app.use('/api/parent', parentPortal);

    agent = request.agent(app);
    await agent.post('/test/set-session').send({
      parentId: FAKE_PARENT_ID,
      parentEmail: 'test-parent@test.com',
    });
  });

  const forbiddenExactPaths = [
    '/api/parent/youth-data',
    '/api/parent/mood-summary',
    '/api/parent/activity-summary',
    '/api/parent/dashboard',
    '/api/parent/alerts',
  ];

  const forbiddenPatternPaths = [
    `/api/parent/youth-data/${FAKE_YOUTH_ID}`,
    `/api/parent/privacy-summary/${FAKE_YOUTH_ID}`,
    `/api/parent/data/export/${FAKE_YOUTH_ID}`,
    `/api/parent/data/delete/${FAKE_YOUTH_ID}`,
    `/api/parent/consent-history/${FAKE_YOUTH_ID}`,
    `/api/parent/activity-summary/${FAKE_YOUTH_ID}`,
    `/api/parent/children/${FAKE_YOUTH_ID}/schedule`,
  ];

  for (const path of forbiddenExactPaths) {
    it(`blocks GET ${path} with 403 PILOT_DATA_GATE`, async () => {
      const res = await agent.get(path);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PILOT_DATA_GATE');
    });
  }

  for (const path of forbiddenPatternPaths) {
    it(`blocks GET ${path} with 403 PILOT_DATA_GATE`, async () => {
      const res = await agent.get(path);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PILOT_DATA_GATE');
    });
  }

  it('allows GET /api/parent/session (not forbidden)', async () => {
    const res = await agent.get('/api/parent/session');
    expect(res.status).not.toBe(403);
  });

  it('allows GET /api/parent/children (not forbidden)', async () => {
    const res = await agent.get('/api/parent/children');
    expect(res.status).not.toBe(403);
  });

  // NOTE: /documents is now in the pilot forbidden list (SOT LOCKED RULES —
  // parent portal scope is consent wallet only). Legacy documents and
  // emergency-contacts endpoints are blocked by pilotDataGate.
  it('forbids GET /api/parent/documents (non-canonical consent docs)', async () => {
    const res = await agent.get('/api/parent/documents');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PILOT_DATA_GATE');
  });

  it(`forbids POST /api/parent/consent/withdraw/:youthId (legacy withdraw)`, async () => {
    const res = await agent
      .post(`/api/parent/consent/withdraw/${FAKE_YOUTH_ID}`)
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PILOT_DATA_GATE');
  });

  it(`forbids GET /api/parent/emergency-contacts/:youthId (out of consent scope)`, async () => {
    const res = await agent.get(`/api/parent/emergency-contacts/${FAKE_YOUTH_ID}`);
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PILOT_DATA_GATE');
  });

  // T005 (Phase 1e — H1+H4): pilotDataGate is now allow-list / deny-by-default.
  // Any new path added to parent-portal.js that is NOT explicitly permitted
  // must 403. These three assertions guard that invariant: a future route a
  // developer accidentally adds will fail this test until they consciously
  // add it to PILOT_PARENT_ALLOWED_PATHS / PILOT_PARENT_ALLOWED_PREFIXES.
  it('denies unknown GET /api/parent/zzz-future-route by default (deny-by-default)', async () => {
    const res = await agent.get('/api/parent/zzz-future-route');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PILOT_DATA_GATE');
  });

  it('denies unknown GET /api/parent/insights (deny-by-default)', async () => {
    const res = await agent.get('/api/parent/insights');
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PILOT_DATA_GATE');
  });

  it('denies unknown POST /api/parent/messages (deny-by-default)', async () => {
    const res = await agent.post('/api/parent/messages').send({ body: 'hi' });
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('PILOT_DATA_GATE');
  });
});
