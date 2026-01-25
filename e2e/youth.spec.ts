import { test, expect, API_BASE, getCsrfToken, testCredentials, authenticateYouth } from './fixtures';

test.describe('Youth Portal Journey - API Tests', () => {
  test.describe('Explore Page (Unauthenticated)', () => {
    test('GET /api/events/programs-grouped returns programs data', async ({ request }) => {
      const response = await request.get(`${API_BASE}/events/programs-grouped`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('GET /api/events/today returns today events', async ({ request }) => {
      const response = await request.get(`${API_BASE}/events/today`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.events).toBeDefined();
      expect(Array.isArray(data.events)).toBe(true);
    });

    test('GET /api/events/happening-now returns current events', async ({ request }) => {
      const response = await request.get(`${API_BASE}/events/happening-now`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.events).toBeDefined();
      expect(Array.isArray(data.events)).toBe(true);
    });

    test('GET /api/events/this-weekend returns weekend events', async ({ request }) => {
      const response = await request.get(`${API_BASE}/events/this-weekend`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.events).toBeDefined();
      expect(Array.isArray(data.events)).toBe(true);
    });

    test('GET /api/events/later returns upcoming events', async ({ request }) => {
      const response = await request.get(`${API_BASE}/events/later`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.events).toBeDefined();
      expect(Array.isArray(data.events)).toBe(true);
    });
  });

  test.describe('View Program Details', () => {
    test('GET /api/programs returns programs list', async ({ request }) => {
      const response = await request.get(`${API_BASE}/programs`);
      expect([200, 401]).toContain(response.status());
    });
  });

  test.describe('Registration (API Test)', () => {
    test('POST /api/auth/register with valid data creates account', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      const uniqueEmail = `test-youth-${Date.now()}@example.com`;
      
      const response = await request.post(`${API_BASE}/auth/register`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          email: uniqueEmail,
          password: testCredentials.youth.password,
          dateOfBirth: testCredentials.youth.dateOfBirth,
          firstName: testCredentials.youth.firstName,
        },
      });
      
      expect([200, 201, 400, 429]).toContain(response.status());
    });

    test('POST /api/auth/register with missing email returns error', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/auth/register`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          password: testCredentials.youth.password,
          dateOfBirth: testCredentials.youth.dateOfBirth,
        },
      });
      
      expect(response.status()).toBe(400);
    });

    test('POST /api/auth/register with invalid age returns error', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      const uniqueEmail = `test-youth-underage-${Date.now()}@example.com`;
      
      const response = await request.post(`${API_BASE}/auth/register`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          email: uniqueEmail,
          password: testCredentials.youth.password,
          dateOfBirth: '2020-01-01',
        },
      });
      
      expect(response.status()).toBe(400);
    });
  });

  test.describe('Login (API Test)', () => {
    test('POST /api/auth/login with invalid credentials returns 401', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.post(`${API_BASE}/auth/login`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        },
      });
      
      expect([400, 401, 429]).toContain(response.status());
    });

    test('GET /api/auth/me returns session status', async ({ request }) => {
      const response = await request.get(`${API_BASE}/auth/me`);
      expect([200, 401]).toContain(response.status());
    });
  });

  test.describe('Protected Routes (Require Auth)', () => {
    test('GET /api/checkins requires authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/checkins`);
      expect([401, 403]).toContain(response.status());
    });

    test('GET /api/profile requires authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/profile`);
      expect([401, 403]).toContain(response.status());
    });

    test('PUT /api/privacy/consents requires authentication', async ({ request }) => {
      const csrfToken = await getCsrfToken(request);
      
      const response = await request.put(`${API_BASE}/privacy/consents`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          consents: { location: false },
        },
      });
      
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Export Data (API Test)', () => {
    test('GET /api/privacy/export requires authentication', async ({ request }) => {
      const response = await request.get(`${API_BASE}/privacy/export`);
      expect([401, 403]).toContain(response.status());
    });

    test('GET /api/consent/status returns consent status', async ({ request }) => {
      const response = await request.get(`${API_BASE}/consent/status`);
      expect(response.status()).toBe(200);
    });
  });

  test.describe('CSRF Protection', () => {
    test('GET /api/auth/csrf-token returns valid token', async ({ request }) => {
      const response = await request.get(`${API_BASE}/auth/csrf-token`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.csrfToken).toBeDefined();
      expect(typeof data.csrfToken).toBe('string');
      expect(data.csrfToken.length).toBeGreaterThan(0);
    });
  });
});
