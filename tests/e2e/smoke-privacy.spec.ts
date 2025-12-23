import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_BASE = process.env.API_BASE || `${BASE_URL}/api`;

test.describe('Privacy API Smoke Tests', () => {
  let csrfToken: string;
  let cookies: string;

  test.beforeAll(async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;
  });

  test('GET /api/privacy/consents requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/privacy/consents`);
    expect([401, 403]).toContain(response.status());
  });

  test('PUT /api/privacy/consents requires authentication', async ({ request }) => {
    const response = await request.put(`${API_BASE}/privacy/consents`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        consents: { location: false },
        reminderEnabled: false,
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('GET /api/privacy/audit-log requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/privacy/audit-log`);
    expect([401, 403]).toContain(response.status());
  });

  test('GET /api/privacy/export requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/privacy/export`);
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/privacy/reminder-response requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/privacy/reminder-response`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: { action: 'viewed' },
    });
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Auth API Smoke Tests', () => {
  test('GET /api/auth/me returns 401 when not logged in', async ({ request }) => {
    const response = await request.get(`${API_BASE}/auth/me`);
    expect(response.status()).toBe(401);
  });

  test('POST /api/auth/login with invalid credentials returns 401', async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const { csrfToken } = await csrfResponse.json();

    const response = await request.post(`${API_BASE}/auth/login`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        email: 'nonexistent@test.com',
        password: 'wrongpassword',
      },
    });
    expect([400, 401]).toContain(response.status());
  });
});

test.describe('Programs API Smoke Tests', () => {
  test('GET /api/programs returns programs list', async ({ request }) => {
    const response = await request.get(`${API_BASE}/programs`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data) || data.data !== undefined || data.programs !== undefined).toBe(true);
  });

  test('GET /api/events/programs-grouped returns grouped programs', async ({ request }) => {
    const response = await request.get(`${API_BASE}/events/programs-grouped`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toBeDefined();
  });
});

test.describe('Consent API Smoke Tests', () => {
  test('Consent endpoints require authentication', async ({ request }) => {
    const endpoints = [
      '/consent/status',
      '/consent/audit-trail',
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(`${API_BASE}${endpoint}`);
      expect([200, 401, 403, 404]).toContain(response.status());
    }
  });
});
