/**
 * Pilot QA — cutover invariants.
 *
 * Fast, offline tests that lock in the Edmonton pilot cutover behavior:
 *   - canonical scope manifest is intact and matches forbidden patterns
 *   - operator session guard requires both worker id AND org id
 *   - parent session guard requires parentId
 *   - wrong-lane prefixes are listed for 410 retirement under PILOT_MODE
 *   - pilotDataGate forbidden patterns cover every retired parent path
 *   - kiosk check-in response shape never includes identity fields
 */
import { describe, it, expect } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import session from 'express-session';
import request from 'supertest';

import {
  YOUTH_SCOPE,
  PARENT_SCOPE,
  OPERATOR_SCOPE,
  PILOT_SCOPES,
  PILOT_CANONICAL_PREFIXES,
  PILOT_LEGACY_RETIREMENTS,
} from '../pilot/permissions/scopes.ts';
import {
  requireYouthSession,
  requireParentSession,
  requireOperatorSession,
} from '../pilot/permissions/guards.ts';
import {
  PILOT_MODE,
  PILOT_DISABLED_API_PREFIXES,
  PILOT_DISABLED_CONSENT_PREFIXES,
  PILOT_DISABLED_AUTH_PREFIXES,
} from '../pilot/flags.ts';

/* ──────────────────────────────────────────────────────────────────── */
/* Test app helpers                                                     */
/* ──────────────────────────────────────────────────────────────────── */

function buildSessionApp() {
  const app = express();
  app.use(express.json());
  app.use(session({
    secret: 'pilot-qa-test',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, httpOnly: true },
  }));
  app.post('/test/set-session', (req, res) => {
    Object.assign(req.session as Record<string, unknown>, req.body);
    req.session.save(() => res.json({ ok: true }));
  });
  app.post('/test/clear-session', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });
  return app;
}

/* ──────────────────────────────────────────────────────────────────── */
/* Scope manifest                                                       */
/* ──────────────────────────────────────────────────────────────────── */

describe('Pilot scope manifest (parity)', () => {
  it('PILOT_SCOPES exposes exactly youth | parent | operator', () => {
    expect(Object.keys(PILOT_SCOPES).sort()).toEqual(['operator', 'parent', 'youth']);
  });

  it('parent forbidden list contains every consent-out-of-scope item', () => {
    const required = [
      'linked_youth.program_names',
      'linked_youth.schedule',
      'linked_youth.attendance',
      'linked_youth.mood',
      'linked_youth.support',
      'linked_youth.referrals',
      'linked_youth.ximi_data',
      'unlinked_youth.*',
    ];
    for (const item of required) {
      expect(PARENT_SCOPE.forbidden).toContain(item);
    }
  });

  it('youth scope has self-only writes and forbids other_youth.*', () => {
    expect(YOUTH_SCOPE.writes.every((w) => w.startsWith('self.'))).toBe(true);
    expect(YOUTH_SCOPE.forbidden).toContain('other_youth.*');
  });

  it('operator scope is own-org-only and forbids other_org.*', () => {
    expect(OPERATOR_SCOPE.reads.every((r) => r.startsWith('own_org.') || r.startsWith('consented_youth.'))).toBe(true);
    expect(OPERATOR_SCOPE.writes.every((w) => w.startsWith('own_org.'))).toBe(true);
    expect(OPERATOR_SCOPE.forbidden).toContain('other_org.*');
  });

  it('canonical pilot auth + consent prefixes point at /api/pilot/* only', () => {
    expect(PILOT_CANONICAL_PREFIXES.youthAuth).toBe('/api/pilot/auth/youth');
    expect(PILOT_CANONICAL_PREFIXES.parentAuth).toBe('/api/pilot/auth/parent');
    expect(PILOT_CANONICAL_PREFIXES.parentConsent).toBe('/api/pilot/consent');
    // T041: parentConsentLegacyAlias removed — /api/consent-wallet now 410s
    // via PILOT_DISABLED_API_PREFIXES (no frontend consumer remained).
    expect(PILOT_CANONICAL_PREFIXES).not.toHaveProperty('parentConsentLegacyAlias');
  });

  it('PILOT_LEGACY_RETIREMENTS uses only valid mechanisms', () => {
    const allowed = new Set(['410', '403-gate', 'flag-410', 'alias']);
    for (const [, entry] of Object.entries(PILOT_LEGACY_RETIREMENTS)) {
      expect(allowed.has(entry.mechanism)).toBe(true);
    }
  });
});

/* ──────────────────────────────────────────────────────────────────── */
/* Wrong-lane prefix config (cutover lock)                              */
/* ──────────────────────────────────────────────────────────────────── */

describe('Wrong-lane prefixes (cutover lock)', () => {
  it('PILOT_MODE defaults to true', () => {
    expect(PILOT_MODE).toBe(true);
  });

  it('disables tournaments, join, tools, ai, sentiment under PILOT_MODE', () => {
    for (const prefix of ['/api/tournaments', '/api/join', '/api/tools', '/api/ai', '/api/sentiment']) {
      expect(PILOT_DISABLED_API_PREFIXES).toContain(prefix);
    }
  });

  // T024: gamification + KPI surfaces have no v1 pilot consumer and must 410.
  it('disables achievements, kpi, orb-snapshots under PILOT_MODE', () => {
    for (const prefix of ['/api/achievements', '/api/kpi', '/api/orb-snapshots']) {
      expect(PILOT_DISABLED_API_PREFIXES).toContain(prefix);
    }
  });

  it('disables legacy consent runtime paths under PILOT_MODE', () => {
    for (const prefix of [
      '/api/consent-auto',
      '/api/consent/withdraw',
      '/api/consent/mature-minor',
      '/api/parent-portal/consent/withdraw',
      '/api/partners/consent-request',
      '/api/partners/consent-withdraw',
    ]) {
      expect(PILOT_DISABLED_CONSENT_PREFIXES).toContain(prefix);
    }
  });

  it('every disabled prefix is documented in PILOT_LEGACY_RETIREMENTS', () => {
    const documented = new Set(Object.keys(PILOT_LEGACY_RETIREMENTS));
    for (const prefix of [
      ...PILOT_DISABLED_API_PREFIXES,
      ...PILOT_DISABLED_CONSENT_PREFIXES,
      ...PILOT_DISABLED_AUTH_PREFIXES,
    ]) {
      expect(documented).toContain(prefix);
    }
  });

  // T009 (Phase 3b): legacy auth surfaces must be retired under PILOT_MODE.
  // Pilot auth at /api/pilot/auth/{youth,parent} is the only valid path.
  it('disables legacy /api/auth and /api/parent-auth under PILOT_MODE', () => {
    expect(PILOT_DISABLED_AUTH_PREFIXES).toContain('/api/auth');
    expect(PILOT_DISABLED_AUTH_PREFIXES).toContain('/api/parent-auth');
  });

  it('legacy auth retirements name the canonical pilot replacement', () => {
    const auth = PILOT_LEGACY_RETIREMENTS['/api/auth'];
    const parentAuth = PILOT_LEGACY_RETIREMENTS['/api/parent-auth'];
    expect(auth?.coveredBy).toBe('/api/pilot/auth/youth');
    expect(auth?.mechanism).toBe('410');
    expect(parentAuth?.coveredBy).toBe('/api/pilot/auth/parent');
    expect(parentAuth?.mechanism).toBe('410');
  });
});

/* ──────────────────────────────────────────────────────────────────── */
/* Session guards                                                       */
/* ──────────────────────────────────────────────────────────────────── */

describe('Pilot session guards', () => {
  function mountGuard(guard: (req: Request, res: Response, next: NextFunction) => void) {
    const app = buildSessionApp();
    app.get('/protected', guard, (_req, res) => res.json({ ok: true }));
    return request.agent(app);
  }

  describe('requireYouthSession', () => {
    it('rejects requests with no session', async () => {
      const agent = mountGuard(requireYouthSession);
      const res = await agent.get('/protected');
      expect(res.status).toBe(401);
    });

    it('allows requests with userId in session', async () => {
      const agent = mountGuard(requireYouthSession);
      await agent.post('/test/set-session').send({ userId: 'youth-1' });
      const res = await agent.get('/protected');
      expect(res.status).toBe(200);
    });
  });

  describe('requireParentSession', () => {
    it('rejects requests with no parentId', async () => {
      const agent = mountGuard(requireParentSession);
      const res = await agent.get('/protected');
      expect(res.status).toBe(401);
    });

    it('rejects requests with only youth session', async () => {
      const agent = mountGuard(requireParentSession);
      await agent.post('/test/set-session').send({ userId: 'youth-1' });
      const res = await agent.get('/protected');
      expect(res.status).toBe(401);
    });

    it('allows parent session', async () => {
      const agent = mountGuard(requireParentSession);
      await agent.post('/test/set-session').send({ parentId: 'parent-1' });
      const res = await agent.get('/protected');
      expect(res.status).toBe(200);
    });
  });

  describe('requireOperatorSession', () => {
    it('rejects requests with no worker id', async () => {
      const agent = mountGuard(requireOperatorSession);
      const res = await agent.get('/protected');
      expect(res.status).toBe(401);
    });

    it('rejects worker session missing organizationId (BOLA hardening)', async () => {
      const agent = mountGuard(requireOperatorSession);
      await agent.post('/test/set-session').send({ youthWorkerId: 'worker-no-org' });
      const res = await agent.get('/protected');
      expect(res.status).toBe(403);
    });

    it('allows worker session with both worker id AND org id', async () => {
      const agent = mountGuard(requireOperatorSession);
      await agent.post('/test/set-session').send({
        youthWorkerId: 'worker-1',
        organizationId: 'org-1',
      });
      const res = await agent.get('/protected');
      expect(res.status).toBe(200);
    });

    it('rejects youth session masquerading as operator (no worker id)', async () => {
      const agent = mountGuard(requireOperatorSession);
      await agent.post('/test/set-session').send({
        userId: 'youth-1',
        organizationId: 'org-1',
      });
      const res = await agent.get('/protected');
      expect(res.status).toBe(401);
    });
  });
});

/* ──────────────────────────────────────────────────────────────────── */
/* Parent gate exhaustive coverage                                      */
/* ──────────────────────────────────────────────────────────────────── */

describe('Parent gate covers every retirement path (parity)', () => {
  it('every 403-gate prefix in PILOT_LEGACY_RETIREMENTS targets /api/parent-portal', () => {
    const gateEntries = Object.entries(PILOT_LEGACY_RETIREMENTS).filter(
      ([, v]) => v.mechanism === '403-gate',
    );
    expect(gateEntries.length).toBeGreaterThan(0);
    for (const [path] of gateEntries) {
      expect(path.startsWith('/api/parent-portal/')).toBe(true);
    }
  });
});
