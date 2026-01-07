import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

test.describe('Ximi Chat Authentication Tests', () => {
  let csrfToken: string;

  test.beforeAll(async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;
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

  test('POST /api/ximi/follow-up requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/follow-up`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        checkinId: 'test-checkin-id',
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/consent requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/consent`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        consent: true,
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('GET /api/ximi/trends requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/ximi/trends`);
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/recommendations requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/recommendations`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        currentMood: 'clear',
        wellnessDimensions: ['emotional'],
      },
    });
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Ximi Chat CSRF Protection Tests', () => {
  test('POST /api/ximi/chat requires CSRF token', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/chat`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        message: 'Hello Ximi',
        moodType: 'clear',
        wellnessDimensions: ['emotional'],
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/follow-up requires CSRF token', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/follow-up`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        checkinId: 'test-checkin-id',
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/consent requires CSRF token', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/consent`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        consent: true,
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/recommendations requires CSRF token', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/recommendations`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        currentMood: 'clear',
        wellnessDimensions: ['emotional'],
      },
    });
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Ximi Chat with Crisis Keywords (Unauthenticated)', () => {
  let csrfToken: string;

  test.beforeAll(async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;
  });

  test('POST /api/ximi/chat with "suicide" keyword returns 401/403 when unauthenticated', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/chat`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        message: 'I am thinking about suicide',
        moodType: 'stormy',
        wellnessDimensions: ['emotional'],
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/chat with "kill myself" keyword returns 401/403 when unauthenticated', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/chat`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        message: 'I want to kill myself',
        moodType: 'cold',
        wellnessDimensions: ['emotional', 'mental'],
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/chat with "hurt myself" keyword returns 401/403 when unauthenticated', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/chat`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        message: 'I want to hurt myself',
        moodType: 'stormy',
        wellnessDimensions: ['physical'],
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/chat with "hopeless" keyword returns 401/403 when unauthenticated', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/chat`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        message: 'Everything feels hopeless',
        moodType: 'foggy',
        wellnessDimensions: ['emotional'],
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/chat with "worthless" keyword returns 401/403 when unauthenticated', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/chat`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        message: 'I feel worthless',
        moodType: 'cold',
        wellnessDimensions: ['emotional', 'social'],
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/chat with "self-harm" keyword returns 401/403 when unauthenticated', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/chat`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        message: 'I have been thinking about self-harm',
        moodType: 'stormy',
        wellnessDimensions: ['emotional', 'physical'],
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/chat with "want to die" keyword returns 401/403 when unauthenticated', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/chat`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        message: 'Sometimes I want to die',
        moodType: 'cold',
        wellnessDimensions: ['emotional'],
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/chat with "end my life" keyword returns 401/403 when unauthenticated', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/chat`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        message: 'I want to end my life',
        moodType: 'cold',
        wellnessDimensions: ['emotional', 'mental'],
      },
    });
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Ximi Conversations Pagination', () => {
  test('GET /api/ximi/conversations with pagination params requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/ximi/conversations?limit=10&offset=0`);
    expect([401, 403]).toContain(response.status());
  });

  test('GET /api/ximi/conversations with large limit requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/ximi/conversations?limit=100`);
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Ximi Trends Window Types', () => {
  test('GET /api/ximi/trends with week window requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/ximi/trends?windowType=week`);
    expect([401, 403]).toContain(response.status());
  });

  test('GET /api/ximi/trends with month window requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/ximi/trends?windowType=month`);
    expect([401, 403]).toContain(response.status());
  });

  test('GET /api/ximi/trends with quarter window requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/ximi/trends?windowType=quarter`);
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Ximi Chat Input Validation (Unauthenticated)', () => {
  let csrfToken: string;

  test.beforeAll(async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;
  });

  test('POST /api/ximi/chat with empty message requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/chat`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        message: '',
        moodType: 'clear',
      },
    });
    expect([400, 401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/chat with missing message requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/chat`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        moodType: 'clear',
      },
    });
    expect([400, 401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/chat with invalid moodType requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/chat`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        message: 'Hello',
        moodType: 'invalid-mood',
      },
    });
    expect([400, 401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/consent with invalid consent type requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/consent`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        consent: 'yes',
      },
    });
    expect([400, 401, 403]).toContain(response.status());
  });
});

test.describe('Ximi Recommendations with Location', () => {
  let csrfToken: string;

  test.beforeAll(async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;
  });

  test('POST /api/ximi/recommendations with location requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/recommendations`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        currentMood: 'clear',
        wellnessDimensions: ['emotional'],
        userLat: 53.5461,
        userLng: -113.4938,
        prioritizeNearby: true,
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/ximi/recommendations without trends requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/ximi/recommendations`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        currentMood: 'breezy',
        wellnessDimensions: ['physical', 'social'],
        includetrends: false,
      },
    });
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Ximi All Mood Types', () => {
  let csrfToken: string;

  test.beforeAll(async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;
  });

  const moodTypes = ['cold', 'stormy', 'foggy', 'clear', 'breezy', 'aurora'];

  for (const mood of moodTypes) {
    test(`POST /api/ximi/chat with mood "${mood}" requires authentication`, async ({ request }) => {
      const response = await request.post(`${API_BASE}/ximi/chat`, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        data: {
          message: `Feeling ${mood} today`,
          moodType: mood,
          wellnessDimensions: ['emotional'],
        },
      });
      expect([401, 403]).toContain(response.status());
    });
  }
});
