import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const API_BASE = `${BASE_URL}/api`;

/**
 * Research Consent Enforcement Tests
 * 
 * These tests verify that endpoints requiring research participation consent
 * properly enforce authentication and consent requirements.
 * 
 * Research consent enforcement flow:
 * 1. Unauthenticated requests → 401 Unauthorized
 * 2. Authenticated users WITHOUT research consent → 403 Forbidden with code: 'CONSENT_REQUIRED'
 * 3. Authenticated users WITH research consent → 200 OK (normal operation)
 * 
 * The requireResearchConsent() middleware checks the privacy_consents table
 * for researchParticipation === true before allowing access.
 */

test.describe('Research Consent Enforcement - Authentication Tests', () => {
  let csrfToken: string;

  test.beforeAll(async ({ request }) => {
    const csrfResponse = await request.get(`${API_BASE}/auth/csrf-token`);
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.csrfToken;
  });

  test('GET /api/events/recommendations requires authentication', async ({ request }) => {
    const response = await request.get(`${API_BASE}/events/recommendations`);
    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('GET /api/events/recommendations returns proper error structure for unauthenticated requests', async ({ request }) => {
    const response = await request.get(`${API_BASE}/events/recommendations`);
    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(typeof body.error).toBe('string');
  });

  test('POST /api/mood-drop requires authentication', async ({ request }) => {
    const response = await request.post(`${API_BASE}/mood-drop`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        mood: 'clear',
        message: 'Test mood drop',
      },
    });
    expect([401, 403]).toContain(response.status());
    
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('POST /api/mood-drop returns proper error structure for unauthenticated requests', async ({ request }) => {
    const response = await request.post(`${API_BASE}/mood-drop`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      data: {
        mood: 'breezy',
        message: 'Feeling good today',
      },
    });
    expect([401, 403]).toContain(response.status());
    
    const body = await response.json();
    expect(body.error).toBeDefined();
    expect(typeof body.error).toBe('string');
  });
});

test.describe('Research Consent Enforcement - CSRF Protection Tests', () => {
  test('POST /api/mood-drop requires CSRF token', async ({ request }) => {
    const response = await request.post(`${API_BASE}/mood-drop`, {
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        mood: 'aurora',
        message: 'Test without CSRF',
      },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('POST /api/mood-drop with invalid CSRF token is rejected', async ({ request }) => {
    const response = await request.post(`${API_BASE}/mood-drop`, {
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': 'invalid-csrf-token',
      },
      data: {
        mood: 'foggy',
        message: 'Test with invalid CSRF',
      },
    });
    expect([401, 403]).toContain(response.status());
  });
});

/**
 * NOTE: The following test scenarios require authenticated sessions to verify:
 * 
 * Authenticated users WITHOUT research consent:
 * - GET /api/events/recommendations → 403 with { code: 'CONSENT_REQUIRED', missingConsents: ['research'] }
 * - POST /api/mood-drop → 403 with { code: 'CONSENT_REQUIRED', missingConsents: ['research'] }
 * 
 * The response structure for consent-blocked requests:
 * {
 *   error: 'Consent required',
 *   code: 'CONSENT_REQUIRED',
 *   missingConsents: ['research'],
 *   message: 'You must grant the required consents in Privacy Center before accessing this feature'
 * }
 * 
 * Authenticated users WITH research consent:
 * - GET /api/events/recommendations → 200 with recommendations data
 * - POST /api/mood-drop → 200 with created mood drop data
 * 
 * These scenarios would require setting up authenticated test users with
 * specific consent configurations, which is beyond the scope of unauthenticated E2E tests.
 */
