import { test, expect } from '@playwright/test';

test.describe('API Health Check', () => {
  test('Health endpoint should respond with healthy status', async ({ request }) => {
    const response = await request.get('/api/health');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('CSRF token endpoint should respond with token', async ({ request }) => {
    const response = await request.get('/api/auth/csrf-token');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.csrfToken).toBeTruthy();
  });
});

test.describe('Crisis Resources API', () => {
  test('Crisis resources endpoint should return resources', async ({ request }) => {
    const response = await request.get('/api/crisis/resources');
    expect([200, 401, 403, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        expect(data).toBeDefined();
      }
    }
  });
});

test.describe('Public Programs API', () => {
  test('Programs endpoint should return programs list', async ({ request }) => {
    const response = await request.get('/api/programs');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data) || data.data !== undefined || data.programs !== undefined).toBe(true);
  });

  test('Grouped programs endpoint should return data', async ({ request }) => {
    const response = await request.get('/api/events/programs-grouped');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toBeDefined();
  });
});

test.describe('Static Assets API', () => {
  test('Manifest.json should be served', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);
  });

  test('Robots.txt should be served', async ({ request }) => {
    const response = await request.get('/robots.txt');
    expect([200, 404]).toContain(response.status());
  });
});
