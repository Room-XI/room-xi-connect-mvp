import { test, expect, API_BASE, getCsrfToken, testCredentials } from './fixtures';

test.describe('Parent Portal Journey - API Tests', () => {
  test.describe('Parent Login Page Access', () => {
    test('Parent login endpoint exists', async ({ request }) => {
      const response = await request.get(`${API_BASE}/parent-auth/status`);
      expect([200, 401]).toContain(response.status());
      
      if (response.status() === 200) {
        const data = await response.json();
        expect(data.isParentSession).toBe(false);
      }
    });
  });

  test.describe('Login with Credentials (API Test)', () => {
    test('POST /api/parent-auth/login with invalid credentials returns error', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/parent-auth/login`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          email: 'nonexistent-parent@example.com',
          password: 'wrongpassword',
        },
      });
      
      expect([400, 401]).toContain(response.status());
    });

    test('POST /api/parent-auth/login without CSRF token fails', async ({ request }) => {
      const response = await request.post(`${API_BASE}/parent-auth/login`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          email: testCredentials.parent.email,
          password: testCredentials.parent.password,
        },
      });
      
      expect([401, 403]).toContain(response.status());
    });

    test('GET /api/parent-auth/csrf-token returns valid token', async ({ request }) => {
      const response = await request.get(`${API_BASE}/parent-auth/csrf-token`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.csrfToken).toBeDefined();
    });
  });

  test.describe('View Linked Youth Data', () => {
    test('GET /api/parent-portal/youth-data requires parent authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/parent-portal/youth-data`);
      expect(response.status()).toBe(401);
    });

    test('GET /api/parent-portal/youth-data/:id requires parent authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/parent-portal/youth-data/123`);
      expect([401, 403, 404]).toContain(response.status());
    });

    test('GET /api/parent-portal/alerts requires parent authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/parent-portal/alerts`);
      expect(response.status()).toBe(401);
    });

    test('GET /api/parent-portal/privacy-summary/:id requires parent authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/parent-portal/privacy-summary/123`);
      expect([401, 403, 404]).toContain(response.status());
    });
  });

  test.describe('Export Data (API Test)', () => {
    test('GET /api/parent-portal/data/export/:youthId requires parent authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/parent-portal/data/export/123`);
      expect([401, 403, 404]).toContain(response.status());
    });

    test('GET /api/parent-portal/consent-history/:youthId requires parent authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/parent-portal/consent-history/123`);
      expect([401, 403, 404]).toContain(response.status());
    });

    test('GET /api/parent-portal/activity-summary/:youthId requires parent authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/parent-portal/activity-summary/123`);
      expect([401, 403, 404]).toContain(response.status());
    });
  });

  test.describe('Logout Redirects', () => {
    test('POST /api/parent-auth/logout returns success (even if not logged in)', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/parent-auth/logout`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });
      
      expect([200, 401]).toContain(response.status());
    });

    test('After logout, status shows not authenticated', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      await request.post(`${API_BASE}/parent-auth/logout`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });
      
      const statusResponse = await request.get(`${API_BASE}/parent-auth/status`);
      expect([200, 401]).toContain(statusResponse.status());
      
      if (statusResponse.status() === 200) {
        const data = await statusResponse.json();
        expect(data.isParentSession).toBe(false);
      }
    });
  });

  test.describe('Consent Response', () => {
    test('POST /api/parent-portal/consent-response requires valid token', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/parent-portal/consent-response`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          token: 'invalid-token',
          decision: 'approved',
        },
      });
      
      expect([400, 401, 403, 404]).toContain(response.status());
    });
  });

  test.describe('Password Setup Flow', () => {
    test('GET /api/parent-auth/validate-setup-token/:token validates token', async ({ request }) => {
      const response = await request.get(`${API_BASE}/parent-auth/validate-setup-token/invalid-token`);
      expect([400, 404]).toContain(response.status());
    });

    test('POST /api/parent-auth/set-password requires valid token', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/parent-auth/set-password`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          token: 'invalid-token',
          password: 'NewPassword123!',
        },
      });
      
      expect([400, 404]).toContain(response.status());
    });
  });
});
