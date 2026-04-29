import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

test.describe('Parent Portal API Tests', () => {
  test('POST /api/parent-portal/consent-response requires valid token', async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const { csrfToken } = await csrfResponse.json();

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

  test('GET /api/parent-portal/youth-data/:id requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/parent-portal/youth-data/123`);
    expect([401, 403, 404]).toContain(response.status());
  });
});

test.describe('Organization Dashboard API Tests', () => {
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
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const { csrfToken } = await csrfResponse.json();

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

test.describe('Explore Gate API Tests', () => {
  test('GET /api/events/programs-grouped returns programs data', async ({ request }) => {
    const response = await request.get(`${API_BASE}/events/programs-grouped`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toBeDefined();
  });

  test('GET /api/events/today returns today events object', async ({ request }) => {
    const response = await request.get(`${API_BASE}/events/today`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.events).toBeDefined();
    expect(Array.isArray(data.events)).toBe(true);
  });

  test('GET /api/events/happening-now returns current events object', async ({ request }) => {
    const response = await request.get(`${API_BASE}/events/happening-now`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.events).toBeDefined();
    expect(Array.isArray(data.events)).toBe(true);
  });

  test('GET /api/events/this-weekend returns weekend events object', async ({ request }) => {
    const response = await request.get(`${API_BASE}/events/this-weekend`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.events).toBeDefined();
    expect(Array.isArray(data.events)).toBe(true);
  });

  test('GET /api/events/later returns upcoming events object', async ({ request }) => {
    const response = await request.get(`${API_BASE}/events/later`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.events).toBeDefined();
    expect(Array.isArray(data.events)).toBe(true);
  });
});

// T041: Legacy /api/admin route family was deleted along with server/routes/admin.js.
// /api/admin/* is now served by the late 410 lockdown via PILOT_DISABLED_API_PREFIXES.
// Pin one assertion so the contract is enforced from the e2e layer too.
test.describe('Retired Admin Portal API (T041)', () => {
  test('GET /api/admin/stats returns 410 LEGACY_API_RETIRED', async ({ request }) => {
    const response = await request.get(`${API_BASE}/admin/stats`);
    expect(response.status()).toBe(410);
    const body = await response.json();
    expect(body.code).toBe('LEGACY_API_RETIRED');
  });

  test('POST /api/admin/login returns 410 LEGACY_API_RETIRED', async ({ request }) => {
    const response = await request.post(`${API_BASE}/admin/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: { username: 'wronguser', password: 'wrongpassword' },
    });
    expect(response.status()).toBe(410);
    const body = await response.json();
    expect(body.code).toBe('LEGACY_API_RETIRED');
  });
});

test.describe('Youth Privacy Settings API Tests', () => {
  test('GET /api/consent/status returns valid response', async ({ request }) => {
    const response = await request.get(`${API_BASE}/consent/status`);
    expect(response.status()).toBe(200);
  });

  test('PUT /api/privacy/consents requires authentication', async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const { csrfToken } = await csrfResponse.json();

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
});
