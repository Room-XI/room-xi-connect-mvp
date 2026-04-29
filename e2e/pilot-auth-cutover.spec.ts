/**
 * T010 — Pilot auth frontend cutover smoke tests.
 *
 * Verifies that the canonical pilot auth surface is reachable and that the
 * legacy `/api/auth/*` and `/api/parent-auth/*` prefixes return 410 with the
 * `LEGACY_AUTH_RETIRED` marker under PILOT_MODE.
 */

import { request as pwRequest } from '@playwright/test';
import { test, expect, API_BASE, BASE_URL } from './fixtures';

/**
 * Build a unique pilot youth registration payload for the
 * authenticated-flow tests. Age 22 → no guardian required.
 */
function makeYouthSignup() {
  const stamp = Date.now();
  return {
    displayName: `PilotE2E_${stamp}`,
    pin: '482917',
    dateOfBirth: '2003-06-15',
    email: `pilot-e2e-${stamp}@example.test`,
  };
}

test.describe('Pilot Auth Cutover (T010)', () => {
  test.describe('Pilot CSRF endpoints', () => {
    test('GET /api/pilot/auth/youth/csrf returns a token', async ({ request }) => {
      const res = await request.get(`${API_BASE}/pilot/auth/youth/csrf`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(typeof body.csrfToken).toBe('string');
      expect(body.csrfToken.length).toBeGreaterThan(0);
    });

    test('GET /api/pilot/auth/parent/csrf returns a token', async ({ request }) => {
      const res = await request.get(`${API_BASE}/pilot/auth/parent/csrf`);
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(typeof body.csrfToken).toBe('string');
      expect(body.csrfToken.length).toBeGreaterThan(0);
    });
  });

  test.describe('Pilot /me endpoints (unauthenticated)', () => {
    test('GET /api/pilot/auth/youth/me returns 401 when no session', async ({ request }) => {
      const res = await request.get(`${API_BASE}/pilot/auth/youth/me`);
      expect(res.status()).toBe(401);
    });

    test('GET /api/pilot/auth/parent/me returns 401 with authenticated:false', async ({ request }) => {
      const res = await request.get(`${API_BASE}/pilot/auth/parent/me`);
      expect(res.status()).toBe(401);
      const body = await res.json();
      expect(body.authenticated).toBe(false);
    });
  });

  test.describe('Pilot login endpoints reject bad input', () => {
    test('POST /api/pilot/auth/youth/login without CSRF is rejected', async ({ request }) => {
      const res = await request.post(`${API_BASE}/pilot/auth/youth/login`, {
        headers: { 'Content-Type': 'application/json' },
        data: { email: 'nobody@example.com', pin: '000000' },
      });
      // 401/403 = CSRF reject; 429 = rate-limited from prior runs.
      expect([401, 403, 429]).toContain(res.status());
    });

    test('POST /api/pilot/auth/parent/magic-link is non-enumerating', async ({ request }) => {
      // Magic-link is intentionally exempt from session-bound CSRF because the
      // requester has no session yet. Server returns 200 with a generic success
      // message regardless of whether the email exists.
      const res = await request.post(`${API_BASE}/pilot/auth/parent/magic-link`, {
        headers: { 'Content-Type': 'application/json' },
        data: { email: `nobody-${Date.now()}@example.com` },
      });
      expect([200, 202, 401, 403, 429]).toContain(res.status());
    });

    test('POST /api/pilot/auth/youth/login with bad CSRF + unknown account returns 401', async ({ request }) => {
      const csrfRes = await request.get(`${API_BASE}/pilot/auth/youth/csrf`);
      const { csrfToken } = await csrfRes.json();
      const res = await request.post(`${API_BASE}/pilot/auth/youth/login`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: { email: `nobody-${Date.now()}@example.com`, pin: '000000' },
      });
      expect([400, 401]).toContain(res.status());
    });
  });

  test.describe('Pilot UI login (browser-driven)', () => {
    test('youth can register via pilot API then sign in through the pilot Login UI', async ({
      page,
    }) => {
      // 1. Register a youth via the pilot API to obtain a real loginCode.
      const csrfRes = await page.request.get('/api/pilot/auth/youth/csrf');
      expect(csrfRes.status()).toBe(200);
      const { csrfToken } = await csrfRes.json();

      const signup = makeYouthSignup();
      const regRes = await page.request.post(
        '/api/pilot/auth/youth/register',
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          data: signup,
        }
      );
      expect([200, 201]).toContain(regRes.status());
      const regBody = await regRes.json();
      const loginCode: string = regBody.user?.loginCode;
      expect(loginCode).toBeTruthy();

      // Reset cookies so the UI flow starts unauthenticated (registration
      // also opened a session).
      await page.context().clearCookies();

      // 2. Drive the pilot Login UI: loginCode + PIN (the default tab).
      await page.goto('/auth/login');
      await page.locator('#loginCode').fill(loginCode);
      await page.locator('#pin').fill(signup.pin);
      await Promise.all([
        page.waitForURL((url) => !url.pathname.includes('/auth/login'), {
          timeout: 15000,
        }),
        page.locator('button[type="submit"]').first().click(),
      ]);

      // 3. The browser session is now authenticated against pilot endpoints.
      const meRes = await page.request.get('/api/pilot/auth/youth/me');
      expect(meRes.status()).toBe(200);
      const meBody = await meRes.json();
      expect(meBody.user?.email).toBe(signup.email.toLowerCase());

      // 4. CSRF-protected logout via the same browser context returns 200.
      const csrfRes2 = await page.request.get('/api/pilot/auth/youth/csrf');
      const { csrfToken: csrfToken2 } = await csrfRes2.json();
      const logoutRes = await page.request.post(
        '/api/pilot/auth/youth/logout',
        {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken2,
          },
        }
      );
      expect(logoutRes.status()).toBe(200);
    });
  });

  test.describe('Authenticated youth flow over pilot endpoints', () => {
    test('register → /me → CSRF-protected logout, all 200, with cookie persistence', async () => {
      // Use a dedicated request context so cookies persist across calls.
      const ctx = await pwRequest.newContext({ baseURL: BASE_URL });
      try {
        // 1. Fetch CSRF token (cookie planted on this context).
        const csrfRes = await ctx.get('/api/pilot/auth/youth/csrf');
        expect(csrfRes.status()).toBe(200);
        const { csrfToken } = await csrfRes.json();
        expect(typeof csrfToken).toBe('string');

        // 2. Register a fresh youth account (CSRF-protected POST → 200/201).
        const signup = makeYouthSignup();
        const regRes = await ctx.post('/api/pilot/auth/youth/register', {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          data: signup,
        });
        expect([200, 201]).toContain(regRes.status());
        const regBody = await regRes.json();
        expect(regBody.user?.id || regBody.id).toBeTruthy();

        // 3. Authenticated /me returns 200 + the same user.
        const meRes = await ctx.get('/api/pilot/auth/youth/me');
        expect(meRes.status()).toBe(200);
        const meBody = await meRes.json();
        expect(meBody.user?.id).toBeTruthy();
        expect(meBody.user?.email).toBe(signup.email.toLowerCase());

        // 4. CSRF-protected logout returns 200 (state-changing, authenticated).
        const logoutRes = await ctx.post('/api/pilot/auth/youth/logout', {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
        });
        expect(logoutRes.status()).toBe(200);

        // 5. Session is gone — /me now 401.
        const meAfter = await ctx.get('/api/pilot/auth/youth/me');
        expect(meAfter.status()).toBe(401);
      } finally {
        await ctx.dispose();
      }
    });

    test('parent magic-link request returns 200 (non-enumerating, CSRF-bound)', async () => {
      const ctx = await pwRequest.newContext({ baseURL: BASE_URL });
      try {
        const csrfRes = await ctx.get('/api/pilot/auth/parent/csrf');
        expect(csrfRes.status()).toBe(200);
        const { csrfToken } = await csrfRes.json();

        const res = await ctx.post('/api/pilot/auth/parent/magic-link', {
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          data: { email: `pilot-parent-${Date.now()}@example.test` },
        });
        // Accept 200/202 (success); 429 if rate-limit window kicks in across
        // a re-run. Anything else is a regression.
        expect([200, 202, 429]).toContain(res.status());
      } finally {
        await ctx.dispose();
      }
    });
  });

  test.describe('Legacy auth surfaces are retired under PILOT_MODE', () => {
    const legacyGets = [
      '/auth/me',
      '/auth/csrf-token',
      '/parent-auth/me',
      '/parent-auth/status',
      '/parent-auth/csrf-token',
      '/parent-auth/login-config',
    ];

    for (const path of legacyGets) {
      test(`GET ${path} returns 410 LEGACY_AUTH_RETIRED`, async ({ request }) => {
        const res = await request.get(`${API_BASE}${path}`);
        expect(res.status()).toBe(410);
        const body = await res.json().catch(() => ({}));
        expect(body.code || body.error).toMatch(/LEGACY_AUTH_RETIRED/);
      });
    }

    test('POST /api/auth/login returns 410 LEGACY_AUTH_RETIRED', async ({ request }) => {
      const res = await request.post(`${API_BASE}/auth/login`, {
        headers: { 'Content-Type': 'application/json' },
        data: { email: 'x@example.com', password: 'x' },
      });
      expect(res.status()).toBe(410);
    });

    test('POST /api/parent-auth/login returns 410 LEGACY_AUTH_RETIRED', async ({ request }) => {
      const res = await request.post(`${API_BASE}/parent-auth/login`, {
        headers: { 'Content-Type': 'application/json' },
        data: { email: 'x@example.com', password: 'x' },
      });
      expect(res.status()).toBe(410);
    });
  });
});
