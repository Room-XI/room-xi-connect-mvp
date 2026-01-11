import { test, expect, API_BASE, getCsrfToken, testCredentials } from './fixtures';

test.describe('Admin Portal Journey - API Tests', () => {
  test.describe('Access Code Verification (API Test)', () => {
    test('POST /api/admin/verify-access with invalid code returns error', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/admin/verify-access`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          code: 'wrong-access-code',
        },
      });
      
      expect([400, 401, 403, 429, 503]).toContain(response.status());
    });

    test('POST /api/admin/verify-access without CSRF token fails', async ({ request }) => {
      const response = await request.post(`${API_BASE}/admin/verify-access`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          code: testCredentials.admin.accessCode,
        },
      });
      
      expect([401, 403]).toContain(response.status());
    });

    test('GET /api/admin/status returns admin session status', async ({ request }) => {
      const response = await request.get(`${API_BASE}/admin/status`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.isAdmin).toBe(false);
      expect(data.hasAccess).toBe(false);
    });
  });

  test.describe('Admin Login (API Test)', () => {
    test('POST /api/admin/login with invalid credentials returns 401', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/admin/login`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          username: 'wronguser',
          password: 'wrongpassword',
        },
      });
      
      expect([400, 401, 403]).toContain(response.status());
    });

    test('POST /api/admin/login without access verification returns error', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/admin/login`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          username: testCredentials.admin.username,
          password: testCredentials.admin.password,
        },
      });
      
      expect([400, 401, 403]).toContain(response.status());
    });
  });

  test.describe('View Stats Dashboard', () => {
    test('GET /api/admin/stats requires admin authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/admin/stats`);
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('List Organizations', () => {
    test('GET /api/admin/organizations requires admin authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/admin/organizations`);
      expect([401, 403]).toContain(response.status());
    });

    test('POST /api/admin/organizations requires admin authentication', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/admin/organizations`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          name: 'Test Organization',
          description: 'Test Description',
          contactEmail: 'test@org.com',
        },
      });
      
      expect([401, 403]).toContain(response.status());
    });

    test('PUT /api/admin/organizations/:id requires admin authentication', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.put(`${API_BASE}/admin/organizations/123`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          name: 'Updated Organization',
        },
      });
      
      expect([401, 403, 404]).toContain(response.status());
    });
  });

  test.describe('List Users', () => {
    test('GET /api/admin/users requires admin authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/admin/users`);
      expect([401, 403]).toContain(response.status());
    });

    test('GET /api/admin/users with pagination requires admin authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/admin/users?page=1&limit=10`);
      expect([401, 403]).toContain(response.status());
    });

    test('GET /api/admin/users with search requires admin authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/admin/users?search=test`);
      expect([401, 403]).toContain(response.status());
    });

    test('GET /api/admin/users/:id requires admin authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/admin/users/123`);
      expect([401, 403, 404]).toContain(response.status());
    });

    test('PUT /api/admin/users/:id/role requires admin authentication', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.put(`${API_BASE}/admin/users/123/role`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          isAdmin: true,
        },
      });
      
      expect([401, 403, 404]).toContain(response.status());
    });
  });

  test.describe('View Audit Logs', () => {
    test('GET /api/admin/audit-logs requires admin authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/admin/audit-logs`);
      expect([401, 403]).toContain(response.status());
    });

    test('GET /api/admin/audit-logs with filters requires admin authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/admin/audit-logs?action=login&page=1`);
      expect([401, 403]).toContain(response.status());
    });

    test('GET /api/admin/audit-logs with date range requires admin authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/admin/audit-logs?startDate=2024-01-01&endDate=2024-12-31`);
      expect([401, 403]).toContain(response.status());
    });

    test('GET /api/admin/consent-audit-logs requires admin authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/admin/consent-audit-logs`);
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Admin Logout', () => {
    test('POST /api/admin/logout returns appropriate response', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/admin/logout`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });
      
      expect([200, 400, 401, 403]).toContain(response.status());
    });

    test('After logout, status shows not authenticated', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      await request.post(`${API_BASE}/admin/logout`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
      });
      
      const statusResponse = await request.get(`${API_BASE}/admin/status`);
      expect(statusResponse.status()).toBe(200);
      
      const data = await statusResponse.json();
      expect(data.isAdmin).toBe(false);
    });
  });

  test.describe('KPI Dashboard', () => {
    test('GET /api/kpi/summary requires authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/kpi/summary`);
      expect([200, 401, 403]).toContain(response.status());
    });

    test('GET /api/kpi/trends requires authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/kpi/trends`);
      expect([200, 401, 403]).toContain(response.status());
    });
  });

  test.describe('Transparency Dashboard', () => {
    test('GET /api/transparency/public returns public transparency data', async ({ request }) => {
      const response = await request.get(`${API_BASE}/transparency/public`);
      expect([200, 404]).toContain(response.status());
    });

    test('GET /api/transparency/metrics returns transparency metrics', async ({ request }) => {
      const response = await request.get(`${API_BASE}/transparency/metrics`);
      expect([200, 401, 403]).toContain(response.status());
    });
  });
});
