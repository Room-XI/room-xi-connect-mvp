/**
 * Pilot cutover — live-route runtime test.
 *
 * Boots the real Express app under PILOT_MODE=true and asserts that every
 * disabled prefix listed in server/pilot/flags.ts actually returns 410 Gone
 * with the canonical retirement code. The static pilot-qa tests verify the
 * configuration; this test verifies the wiring in server/index.js still
 * honours that configuration. Catches accidental re-mounts of legacy
 * routers (e.g. /api/auth, /api/parent-auth) that would otherwise pass CI.
 *
 * Also installs a use-call recorder on `express.application` BEFORE
 * importing server/index.js so we can enumerate every `/api/*` prefix
 * registered during boot and assert the registered set matches the
 * `PILOT_CANONICAL_PREFIXES` manifest (plus declared flag-gated and
 * lockdown prefixes). This is the stack-walk regression check the
 * T038 audit requires.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { Express } from 'express';
import express from 'express';
import request from 'supertest';

// ── Install boot-time use-call recorder BEFORE importing server/index.js ──
//
// BRITTLENESS NOTE (T038 review): We monkey-patch `express.application.use`
// on the prototype because Express 5 hides literal mount paths inside
// opaque matcher closures (verified empirically: layer.regexp / layer.path
// are undefined, layer.matchers is an opaque function), making true
// stack-walking of mounted prefixes impossible. The proxy is installed on
// module load (before beforeAll runs) so it observes every mount call
// createServer makes during boot, and is restored in afterAll so the
// patched prototype does not leak into other test files in the suite.
//
// If Express upgrades to a version that exposes mount paths on the layer
// object directly, this whole recorder block can be replaced with a real
// `app.router.stack` walk and the prototype patch can be deleted.
type RecordedUse = { prefix: string | null };
const recordedUseCalls: RecordedUse[] = [];
const expressApplicationProto = express.application as unknown as {
  use: (...args: unknown[]) => unknown;
};
const originalApplicationUse = expressApplicationProto.use;
expressApplicationProto.use = function patchedUse(
  this: Express,
  ...args: unknown[]
) {
  const first = args[0];
  recordedUseCalls.push({
    prefix: typeof first === 'string' ? first : null,
  });
  return (originalApplicationUse as (...a: unknown[]) => unknown).apply(
    this,
    args,
  );
};

import {
  PILOT_DISABLED_API_PREFIXES,
  PILOT_DISABLED_CONSENT_PREFIXES,
  PILOT_DISABLED_AUTH_PREFIXES,
  ENABLE_XIP,
  ENABLE_SUPPORT_INBOX,
} from '../pilot/flags.ts';
import {
  PILOT_CANONICAL_PREFIXES,
  PILOT_FLAG_GATED_PREFIXES,
} from '../pilot/permissions/scopes.ts';

process.env.PILOT_MODE = 'true';

type SupertestMethod = 'get' | 'post';

let app: Express;

beforeAll(async () => {
  const mod = await import('../index.js');
  const built = await mod.createServer({
    listen: false,
    mountStatic: false,
  });
  app = built.app;
  // T041: createServer no longer returns mountLegacyRoutes — the legacy
  // back-office mount helper was deleted along with admin.js, breach.ts,
  // org.js, org/*, transparency.js, and the /api/consent-wallet alias.
  // The 410 lockdown probes below are now the sole runtime contract.
}, 60_000);

afterAll(() => {
  // Restore the prototype patch so the recorded-use proxy does not leak
  // into other test files that may import express. See the BRITTLENESS
  // NOTE at the top of this file for context.
  expressApplicationProto.use = originalApplicationUse;
});

function probePaths(prefix: string): string[] {
  // Hit a handful of representative subpaths — the prefix mount swallows
  // every method/path beneath it, so probing several is mostly defensive.
  return [prefix, `${prefix}/`, `${prefix}/login`, `${prefix}/anything/here`];
}

/**
 * Typed dispatch helper for supertest's method-by-name access. Avoids
 * `(request(app) as any)[method]` casts inside test bodies.
 */
function dispatch(target: Express, method: SupertestMethod, path: string) {
  const agent = request(target);
  switch (method) {
    case 'get':
      return agent.get(path);
    case 'post':
      return agent.post(path);
  }
}

describe('Pilot cutover — live route 410s (PILOT_MODE=true)', () => {
  it('every disabled API prefix returns 410 with LEGACY_API_RETIRED code', async () => {
    for (const prefix of PILOT_DISABLED_API_PREFIXES) {
      for (const p of probePaths(prefix)) {
        const res = await request(app).get(p);
        expect(
          res.status,
          `expected 410 for GET ${p}, got ${res.status}`,
        ).toBe(410);
        expect(res.body?.code).toBe('LEGACY_API_RETIRED');
      }
    }
  });

  it('every disabled consent prefix returns 410 with LEGACY_API_RETIRED code', async () => {
    for (const prefix of PILOT_DISABLED_CONSENT_PREFIXES) {
      for (const p of probePaths(prefix)) {
        const res = await request(app).post(p).send({});
        expect(
          res.status,
          `expected 410 for POST ${p}, got ${res.status}`,
        ).toBe(410);
        expect(res.body?.code).toBe('LEGACY_API_RETIRED');
      }
    }
  });

  it('every disabled auth prefix returns 410 with LEGACY_AUTH_RETIRED code', async () => {
    for (const prefix of PILOT_DISABLED_AUTH_PREFIXES) {
      for (const p of probePaths(prefix)) {
        const getRes = await request(app).get(p);
        expect(
          getRes.status,
          `expected 410 for GET ${p}, got ${getRes.status}`,
        ).toBe(410);
        expect(getRes.body?.code).toBe('LEGACY_AUTH_RETIRED');

        const postRes = await request(app).post(p).send({ email: 'x@y.z' });
        expect(
          postRes.status,
          `expected 410 for POST ${p}, got ${postRes.status}`,
        ).toBe(410);
        expect(postRes.body?.code).toBe('LEGACY_AUTH_RETIRED');
      }
    }
  });

  it('retired legacy prefixes (admin, breach, org, transparency, consent-wallet) return 410 under PILOT_MODE', async () => {
    // T041: the legacy router files have been DELETED — the 410 short-circuit
    // is the only surface that responds. Probes use the original route shapes
    // (method + path) the deleted routers used to expose, to catch any
    // accidental re-mount that would let a live handler answer instead.
    type Probe = { method: SupertestMethod; path: string };
    const probesByPrefix: Record<string, Probe[]> = {
      '/api/admin': [
        { method: 'get',  path: '/api/admin/anything' },
        { method: 'get',  path: '/api/admin/csrf-token' },
        { method: 'get',  path: '/api/admin/status' },
        { method: 'post', path: '/api/admin/login' },
        { method: 'post', path: '/api/admin/verify-access' },
      ],
      '/api/admin/breach': [
        { method: 'get',  path: '/api/admin/breach/anything' },
        { method: 'get',  path: '/api/admin/breach' },
        { method: 'post', path: '/api/admin/breach' },
      ],
      '/api/org': [
        { method: 'get',  path: '/api/org/anything' },
        { method: 'get',  path: '/api/org/csrf-token' },
        { method: 'get',  path: '/api/org/me' },
        { method: 'post', path: '/api/org/login' },
      ],
      '/api/transparency': [
        { method: 'get',  path: '/api/transparency' },
        { method: 'get',  path: '/api/transparency/anything' },
      ],
      '/api/consent-wallet': [
        { method: 'get',  path: '/api/consent-wallet/requests' },
        { method: 'get',  path: '/api/consent-wallet/wallet' },
        { method: 'post', path: '/api/consent-wallet/requests/x/sign' },
      ],
    };
    for (const [prefix, probes] of Object.entries(probesByPrefix)) {
      expect(PILOT_DISABLED_API_PREFIXES).toContain(prefix);
      for (const { method, path } of probes) {
        const res = await dispatch(app, method, path);
        expect(
          res.status,
          `expected 410 for ${method.toUpperCase()} ${path} under PILOT_MODE, got ${res.status}`,
        ).toBe(410);
        expect(
          res.body?.code,
          `expected LEGACY_API_RETIRED for ${method.toUpperCase()} ${path}, got ${res.body?.code}`,
        ).toBe('LEGACY_API_RETIRED');
      }
    }
  });

  it('retired program-consent endpoints (/api/consent/withdraw, /api/consent/mature-minor) return 410', async () => {
    // T041: these handlers were removed from server/routes/consent.js. The
    // surviving consent.js surface is signup-time guardian-token verification
    // and platform DSAR endpoints; pilot consent decisions live exclusively
    // in /api/pilot/consent (consentEngine).
    const probes: { method: SupertestMethod; path: string }[] = [
      { method: 'post', path: '/api/consent/withdraw' },
      { method: 'get',  path: '/api/consent/mature-minor/status' },
      { method: 'post', path: '/api/consent/mature-minor/submit' },
      { method: 'get',  path: '/api/consent/mature-minor/questions' },
    ];
    for (const { method, path } of probes) {
      const res = await dispatch(app, method, path);
      expect(
        res.status,
        `expected 410 for ${method.toUpperCase()} ${path}, got ${res.status}`,
      ).toBe(410);
      expect(res.body?.code).toBe('LEGACY_API_RETIRED');
    }
  });
});

/* ──────────────────────────────────────────────────────────────────── */
/* Mount switch — canonical-vs-410 observable contract (T038 / Phase 3) */
/* ──────────────────────────────────────────────────────────────────── */

describe('Pilot mount switch (PILOT_MODE=true)', () => {
  // Compose-time set: collapse duplicate values (programs has 3 mounts under
  // one prefix; alias prefixes share the same router).
  const canonicalPrefixes = Array.from(new Set(Object.values(PILOT_CANONICAL_PREFIXES)));

  it('every canonical pilot prefix is reachable (NOT served by legacy 410 lockdown)', async () => {
    for (const prefix of canonicalPrefixes) {
      // Auth/csrf may still 401/403, routes may 404 within the prefix, and
      // flag-gated handlers may return 410 with their OWN code (e.g.
      // SUPPORT_INBOX_DISABLED). Any of those means the pilot mount is live.
      const res = await request(app).get(prefix);
      const isLockdown410 =
        res.status === 410 &&
        (res.body?.code === 'LEGACY_API_RETIRED' || res.body?.code === 'LEGACY_AUTH_RETIRED');
      expect(
        isLockdown410,
        `canonical pilot prefix ${prefix} was stomped by legacy 410 lockdown (status=${res.status} code=${res.body?.code})`,
      ).toBe(false);
    }
  });

  it('high-signal canonical pilot endpoints are actually mounted (not bare 404)', async () => {
    type Probe = { method: SupertestMethod; path: string };
    const liveEndpoints: Probe[] = [
      { method: 'get', path: '/api/pilot/status' },
      { method: 'get', path: '/api/pilot/auth/youth/me' },
      { method: 'get', path: '/api/pilot/auth/parent/me' },
      { method: 'get', path: '/api/pilot/consent/requests' },
      { method: 'get', path: '/api/parent-portal/session' },
      { method: 'get', path: '/api/feature-flags' },
      { method: 'get', path: '/api/events/programs-grouped' },
      { method: 'get', path: '/api/event-rsvps/me' },
    ];
    for (const { method, path } of liveEndpoints) {
      const res = await dispatch(app, method, path);
      expect(
        res.status,
        `canonical endpoint ${method.toUpperCase()} ${path} returned 404 — pilot mount likely gone`,
      ).not.toBe(404);
      const isLockdown410 =
        res.status === 410 &&
        (res.body?.code === 'LEGACY_API_RETIRED' || res.body?.code === 'LEGACY_AUTH_RETIRED');
      expect(
        isLockdown410,
        `canonical endpoint ${method.toUpperCase()} ${path} stomped by legacy 410 lockdown`,
      ).toBe(false);
    }
  });

  it('stack walk: every /api/* mount registered at boot is on the canonical+disabled allow-list', () => {
    /* T038 — direct stack-enumeration regression check.
     *
     * Express 5 hides literal mount paths inside opaque matcher closures
     * (verified: layer.regexp / layer.path are undefined, layer.matchers
     * is opaque). To enumerate prefixes, this test installs a recorder
     * on `express.application.use` BEFORE importing server/index.js (see
     * top of file) and captures every mount call createServer makes.
     *
     * Then we assert:
     *   1. EVERY captured `/api/*` prefix is in the union of:
     *        - PILOT_CANONICAL_PREFIXES values (canonical pilot routers),
     *        - PILOT_FLAG_GATED_PREFIXES (when their flag is on),
     *        - PILOT_DISABLED_API_PREFIXES + …_CONSENT + …_AUTH (the
     *          early- and late-lockdown 410 layers).
     *   2. EVERY canonical prefix is actually mounted at boot — i.e.,
     *      the manifest has no aspirational entries that disappeared
     *      from the runtime.
     *
     * This is the manifest-equality assertion the T038 audit demands.
     */
    type FlagBag = Record<string, boolean>;
    const flags: FlagBag = {
      ENABLE_XIP,
      ENABLE_SUPPORT_INBOX,
    };
    const expectedAllowList = new Set<string>([
      ...Object.values(PILOT_CANONICAL_PREFIXES),
      ...Object.values(PILOT_FLAG_GATED_PREFIXES)
        .filter((entry) => flags[entry.flag] === true)
        .map((entry) => entry.prefix),
      ...PILOT_DISABLED_API_PREFIXES,
      ...PILOT_DISABLED_CONSENT_PREFIXES,
      ...PILOT_DISABLED_AUTH_PREFIXES,
    ]);

    const registeredApiPrefixes = Array.from(
      new Set(
        recordedUseCalls
          .map((c) => c.prefix)
          .filter((p): p is string => typeof p === 'string' && p.startsWith('/api/')),
      ),
    );

    expect(
      registeredApiPrefixes.length,
      'no /api/* mounts captured — the express.application.use recorder failed to install before createServer ran',
    ).toBeGreaterThan(0);

    // (1) No surprise mounts: every registered prefix is on the allow-list.
    const unexpected = registeredApiPrefixes.filter((p) => !expectedAllowList.has(p));
    expect(
      unexpected,
      `mountPilotRoutes registered /api/* prefix(es) not in PILOT_CANONICAL_PREFIXES + PILOT_FLAG_GATED_PREFIXES + lockdown sets: ${JSON.stringify(unexpected)}`,
    ).toEqual([]);

    // (2) Manifest equality on the canonical side: every canonical prefix
    //     was actually registered. Catches deletions that orphan the
    //     manifest entry.
    const registeredSet = new Set(registeredApiPrefixes);
    const missingCanonical = canonicalPrefixes.filter((p) => !registeredSet.has(p));
    expect(
      missingCanonical,
      `PILOT_CANONICAL_PREFIXES has entries not registered by mountPilotRoutes: ${JSON.stringify(missingCanonical)}`,
    ).toEqual([]);
  });

  it('createServer no longer exposes a legacy mount helper (T041)', async () => {
    /* T041 — the mountLegacyRoutes helper was deleted along with admin.js,
     * breach.ts, org.js, org/*, transparency.js, and the /api/consent-wallet
     * alias. Re-import createServer and assert the return shape no longer
     * carries the helper. This is the structural counterpart to the HTTP
     * 410 probes above, which prove no live legacy router exists at runtime.
     */
    const mod = await import('../index.js');
    const built = await mod.createServer({ listen: false, mountStatic: false });
    expect(built).not.toHaveProperty('mountLegacyRoutes');
    expect(typeof built.mountPilotRoutes).toBe('function');
  });

  it('canonical-prefix and disabled-prefix sets are disjoint', () => {
    const disabled = new Set([
      ...PILOT_DISABLED_API_PREFIXES,
      ...PILOT_DISABLED_CONSENT_PREFIXES,
      ...PILOT_DISABLED_AUTH_PREFIXES,
    ]);
    const overlap = canonicalPrefixes.filter((p) => disabled.has(p));
    expect(
      overlap,
      `pilot prefix appears in both canonical AND disabled lists: ${JSON.stringify(overlap)}`,
    ).toEqual([]);
  });
});
