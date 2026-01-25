import { test, expect, API_BASE, getCsrfToken, testCredentials, authenticateYouth } from './fixtures';

test.describe('Organization Portal Journey - API Tests', () => {
  test.describe('Organization Staff Login', () => {
    test('POST /api/auth/login for org staff with invalid credentials returns error', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/auth/login`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          email: testCredentials.org.email,
          password: 'wrongpassword',
        },
      });
      
      expect([400, 401, 429]).toContain(response.status());
    });
  });

  test.describe('Dashboard Access', () => {
    test('GET /api/org/dashboard requires organization access', async ({ request }) => {
      const response = await request.get(`${API_BASE}/org/dashboard`);
      expect([401, 403]).toContain(response.status());
    });

    test('GET /api/org/dashboard/stats requires organization access', async ({ request }) => {
      const response = await request.get(`${API_BASE}/org/dashboard/stats`);
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Programs List', () => {
    test('GET /api/org/programs requires organization access', async ({ request }) => {
      const response = await request.get(`${API_BASE}/org/programs`);
      expect([401, 403]).toContain(response.status());
    });

    test('POST /api/org/programs requires organization access', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/org/programs`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          title: 'Test Program',
          description: 'Test Description',
        },
      });
      
      expect([401, 403]).toContain(response.status());
    });

    test('PUT /api/org/programs/:id requires organization access', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.put(`${API_BASE}/org/programs/123`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          title: 'Updated Program',
        },
      });
      
      expect([401, 403, 404]).toContain(response.status());
    });

    test('DELETE /api/org/programs/:id requires organization access', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.delete(`${API_BASE}/org/programs/123`, {
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });
      
      expect([401, 403, 404]).toContain(response.status());
    });
  });

  test.describe('View Attendance', () => {
    test('GET /api/org/programs/:id/attendance requires organization access', async ({ request }) => {
      const response = await request.get(`${API_BASE}/org/programs/123/attendance`);
      expect([401, 403, 404]).toContain(response.status());
    });

    test('POST /api/org/programs/:id/attendance requires organization access', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/org/programs/123/attendance`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          xidId: 'test-xid',
          method: 'manual',
        },
      });
      
      expect([401, 403, 404]).toContain(response.status());
    });
  });

  test.describe('Export Attendance CSV', () => {
    test('GET /api/org/attendance/export requires organization access', async ({ request }) => {
      const response = await request.get(`${API_BASE}/org/attendance/export`);
      expect([401, 403]).toContain(response.status());
    });

    test('GET /api/org/attendance/export with time range requires organization access', async ({ request }) => {
      const response = await request.get(`${API_BASE}/org/attendance/export?timeRange=7days`);
      expect([401, 403]).toContain(response.status());
    });

    test('GET /api/org/attendance/export with 30 days range requires organization access', async ({ request }) => {
      const response = await request.get(`${API_BASE}/org/attendance/export?timeRange=30days`);
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Member Management', () => {
    test('GET /api/org/members requires organization access', async ({ request }) => {
      const response = await request.get(`${API_BASE}/org/members`);
      expect([401, 403]).toContain(response.status());
    });

    test('POST /api/org/members/invite requires organization access', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/org/members/invite`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          email: 'newmember@example.com',
          role: 'viewer',
        },
      });
      
      expect([401, 403]).toContain(response.status());
    });

    test('PUT /api/org/members/:id/role requires organization access', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.put(`${API_BASE}/org/members/123/role`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          role: 'facilitator',
        },
      });
      
      expect([401, 403, 404]).toContain(response.status());
    });

    test('DELETE /api/org/members/:id requires organization access', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.delete(`${API_BASE}/org/members/123`, {
        headers: {
          'X-CSRF-Token': csrfToken,
        },
      });
      
      expect([401, 403, 404]).toContain(response.status());
    });
  });

  test.describe('Partner Consent APIs', () => {
    test('GET /api/partners/health returns API status', async ({ request }) => {
      const response = await request.get(`${API_BASE}/partners/health`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBeDefined();
    });

    test('GET /api/partners/scopes returns available consent scopes', async ({ request }) => {
      const response = await request.get(`${API_BASE}/partners/scopes`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.scopes).toBeDefined();
      expect(Array.isArray(data.scopes)).toBe(true);
    });

    test('POST /api/partners/consent-request requires authentication', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/partners/consent-request`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          youthId: '123',
          scope: 'field_trip',
        },
      });
      
      expect([401, 403, 501]).toContain(response.status());
    });

    test('GET /api/partners/consent-status/:id requires authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/partners/consent-status/123`);
      expect([401, 403, 404]).toContain(response.status());
    });

    test('GET /api/partners/my-consents requires authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/partners/my-consents`);
      expect([401, 403]).toContain(response.status());
    });
  });
});
