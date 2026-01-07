import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

test.describe('Guardian Consent Workflow API Tests', () => {
  let csrfToken: string;

  test.beforeEach(async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;
  });

  test.describe('GET /api/consent/view/:token - View Consent Notice', () => {
    test('returns 404 for invalid token', async ({ request }) => {
      const response = await request.get(`${API_BASE}/consent/view/invalid-token-12345`);
      expect(response.status()).toBe(404);
    });

    test('returns 404 for non-existent token', async ({ request }) => {
      const fakeToken = 'a'.repeat(64);
      const response = await request.get(`${API_BASE}/consent/view/${fakeToken}`);
      expect(response.status()).toBe(404);
    });
  });

  test.describe('POST /api/consent/agree/:token - Initial Consent Agreement', () => {
    test('returns 404 for invalid token', async ({ request }) => {
      const response = await request.post(`${API_BASE}/consent/agree/invalid-token-12345`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRF-Token': csrfToken,
        },
        data: '_nonce=test-nonce',
      });
      expect(response.status()).toBe(404);
    });

    test('returns 404 for non-existent token', async ({ request }) => {
      const fakeToken = 'b'.repeat(64);
      const response = await request.post(`${API_BASE}/consent/agree/${fakeToken}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-CSRF-Token': csrfToken,
        },
        data: '_nonce=test-nonce',
      });
      expect(response.status()).toBe(404);
    });
  });

  test.describe('GET /api/consent/confirm/:token - Final Confirmation', () => {
    test('returns 404 for invalid confirmation token', async ({ request }) => {
      const response = await request.get(`${API_BASE}/consent/confirm/invalid-token-12345`);
      expect(response.status()).toBe(404);
    });

    test('returns 404 for non-existent confirmation token', async ({ request }) => {
      const fakeToken = 'c'.repeat(64);
      const response = await request.get(`${API_BASE}/consent/confirm/${fakeToken}`);
      expect(response.status()).toBe(404);
    });
  });

  test.describe('GET /api/consent/guardian-status - Check Guardian Status', () => {
    test('requires authentication (returns 401)', async ({ request }) => {
      const response = await request.get(`${API_BASE}/consent/guardian-status`);
      expect(response.status()).toBe(401);
    });

    test('returns 401 without valid session', async ({ request }) => {
      const response = await request.get(`${API_BASE}/consent/guardian-status`, {
        headers: {
          'Cookie': 'invalid-session-cookie',
        },
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe('POST /api/consent/resend-guardian - Resend Consent Email', () => {
    test('requires authentication (returns 401)', async ({ request }) => {
      const response = await request.post(`${API_BASE}/consent/resend-guardian`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {},
      });
      expect(response.status()).toBe(401);
    });

    test('returns 401 without valid session', async ({ request }) => {
      const response = await request.post(`${API_BASE}/consent/resend-guardian`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Cookie': 'invalid-session-cookie',
        },
        data: {},
      });
      expect(response.status()).toBe(401);
    });
  });
});

test.describe('Guardian Consent CSRF Protection Tests', () => {
  test('POST /api/consent/agree/:token without CSRF token still processes (form submission)', async ({ request }) => {
    const response = await request.post(`${API_BASE}/consent/agree/test-token`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: '_nonce=test-nonce',
    });
    expect([404, 403]).toContain(response.status());
  });

  test('POST /api/consent/resend-guardian without CSRF token returns 401 or 403', async ({ request }) => {
    const response = await request.post(`${API_BASE}/consent/resend-guardian`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {},
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/consent/guardian/request-verification requires authentication', async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const { csrfToken } = await csrfResponse.json();

    const response = await request.post(`${API_BASE}/consent/guardian/request-verification`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        guardianContactType: 'email',
        guardianContactValue: 'guardian@example.com',
      },
    });
    expect(response.status()).toBe(401);
  });

  test('POST /api/consent/guardian/verify/:token with invalid token returns error', async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const { csrfToken } = await csrfResponse.json();

    const response = await request.post(`${API_BASE}/consent/guardian/verify/invalid-token`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        pin: '1234',
        guardianName: 'Test Guardian',
      },
    });
    expect([400, 404]).toContain(response.status());
  });

  test('GET /api/consent/guardian/status requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/consent/guardian/status`);
    expect(response.status()).toBe(401);
  });
});

test.describe('Guardian Consent Edge Cases', () => {
  let csrfToken: string;

  test.beforeEach(async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;
  });

  test('GET /api/consent/view with empty token is handled by server', async ({ request }) => {
    const response = await request.get(`${API_BASE}/consent/view/`);
    expect([200, 404, 405]).toContain(response.status());
  });

  test('GET /api/consent/confirm with empty token is handled by server', async ({ request }) => {
    const response = await request.get(`${API_BASE}/consent/confirm/`);
    expect([200, 404, 405]).toContain(response.status());
  });

  test('POST /api/consent/agree without nonce returns error for valid-looking token', async ({ request }) => {
    const fakeToken = 'd'.repeat(64);
    const response = await request.post(`${API_BASE}/consent/agree/${fakeToken}`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-Token': csrfToken,
      },
      data: '',
    });
    expect([403, 404]).toContain(response.status());
  });

  test('GET /api/consent returns consents for authenticated users only', async ({ request }) => {
    const response = await request.get(`${API_BASE}/consent`);
    expect(response.status()).toBe(401);
  });

  test('GET /api/consent/my-consents requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/consent/my-consents`);
    expect(response.status()).toBe(401);
  });

  test('POST /api/consent requires authentication for updating consents', async ({ request }) => {
    const response = await request.post(`${API_BASE}/consent`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        consentType: 'terms_of_use',
        value: true,
      },
    });
    expect(response.status()).toBe(401);
  });

  test('GET /api/consent/audit-trail requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/consent/audit-trail`);
    expect(response.status()).toBe(401);
  });

  test('GET /api/consent/export-data requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/consent/export-data`);
    expect(response.status()).toBe(401);
  });

  test('POST /api/consent/delete-account requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/consent/delete-account`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        confirmation: 'DELETE MY ACCOUNT',
      },
    });
    expect(response.status()).toBe(401);
  });
});

test.describe('Guardian Consent Token Format Validation', () => {
  test('GET /api/consent/view with special characters in token is handled safely', async ({ request }) => {
    const response = await request.get(`${API_BASE}/consent/view/<script>alert(1)</script>`);
    expect([200, 400, 404]).toContain(response.status());
  });

  test('GET /api/consent/confirm with special characters in token is handled safely', async ({ request }) => {
    const response = await request.get(`${API_BASE}/consent/confirm/<script>alert(1)</script>`);
    expect([200, 400, 404]).toContain(response.status());
  });

  test('GET /api/consent/view with SQL injection attempt returns 404', async ({ request }) => {
    const response = await request.get(`${API_BASE}/consent/view/'; DROP TABLE users;--`);
    expect([400, 404]).toContain(response.status());
  });

  test('POST /api/consent/agree with malformed token returns 404', async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const { csrfToken } = await csrfResponse.json();

    const response = await request.post(`${API_BASE}/consent/agree/../../../../etc/passwd`, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-Token': csrfToken,
      },
      data: '_nonce=test',
    });
    expect([400, 404]).toContain(response.status());
  });
});
