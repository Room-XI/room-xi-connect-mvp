import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

test.describe('Consent Enforcement API Tests', () => {
  let csrfToken: string;

  test.beforeAll(async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;
  });

  test('GET /api/geo/aggregate requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/geo/aggregate`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: { timeRange: '7d' },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/geo/hex-for-location requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/geo/hex-for-location`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: { lat: 53.5461, lng: -113.4938 },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/outcomes requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/outcomes`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        programId: 'test-program-id',
        attended: true,
        attendanceDate: new Date().toISOString().split('T')[0],
        helpfulnessRating: 4,
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('GET /api/ximi/conversations requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/ximi/conversations`);
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/chat requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/chat`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        message: 'Hello Ximi',
        moodType: 'clear',
        wellnessDimensions: ['emotional'],
      },
    });
    expect([401, 403]).toContain(response.status());
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
});

test.describe('Consent CSRF Protection Tests', () => {
  test('POST /api/outcomes requires CSRF token', async ({ request }) => {
    const response = await request.post(`${API_BASE}/outcomes`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        programId: 'test-program-id',
        attended: true,
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('PUT /api/privacy/consents requires CSRF token', async ({ request }) => {
    const response = await request.put(`${API_BASE}/privacy/consents`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        consents: { location: false },
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/chat requires CSRF token', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/chat`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        message: 'Test message',
      },
    });
    expect([401, 403]).toContain(response.status());
  });
});
