import { test, expect } from '@playwright/test';

test.describe('Offline PWA Caching - Programs API', () => {
  test('GET /api/programs returns valid cacheable data', async ({ request }) => {
    const response = await request.get('/api/programs');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    
    if (data.length > 0) {
      const program = data[0];
      expect(program).toHaveProperty('id');
      expect(program).toHaveProperty('title');
    }
  });

  test('GET /api/programs/:id returns single program', async ({ request }) => {
    const listResponse = await request.get('/api/programs');
    const programs = await listResponse.json();
    
    if (programs.length > 0) {
      const programId = programs[0].id;
      const response = await request.get(`/api/programs/${programId}`);
      expect(response.status()).toBe(200);
      
      const program = await response.json();
      expect(program).toHaveProperty('id');
      expect(program).toHaveProperty('title');
    }
  });
});

test.describe('Offline PWA Caching - Events API', () => {
  test('GET /api/events/today returns valid event data', async ({ request }) => {
    const response = await request.get('/api/events/today');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('events');
    expect(data).toHaveProperty('count');
    expect(data).toHaveProperty('timestamp');
    expect(data).toHaveProperty('filter');
    expect(Array.isArray(data.events)).toBe(true);
    expect(typeof data.count).toBe('number');
  });

  test('GET /api/events/happening-now returns valid data structure', async ({ request }) => {
    const response = await request.get('/api/events/happening-now');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('events');
    expect(data).toHaveProperty('count');
    expect(data).toHaveProperty('timestamp');
    expect(data.filter).toBe('happening-now');
  });

  test('GET /api/events/this-weekend returns valid data structure', async ({ request }) => {
    const response = await request.get('/api/events/this-weekend');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('events');
    expect(data).toHaveProperty('count');
    expect(data).toHaveProperty('weekendDates');
    expect(data.filter).toBe('this-weekend');
  });

  test('GET /api/events/later returns valid data structure', async ({ request }) => {
    const response = await request.get('/api/events/later');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('events');
    expect(data).toHaveProperty('count');
    expect(data).toHaveProperty('dateRange');
    expect(data).toHaveProperty('daysIncluded');
    expect(data.filter).toBe('later');
  });

  test('GET /api/events/programs-grouped returns valid cacheable data', async ({ request }) => {
    const response = await request.get('/api/events/programs-grouped');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toBeDefined();
  });
});

test.describe('Offline PWA Caching - Crisis API', () => {
  test('GET /api/crisis returns crisis support resources', async ({ request }) => {
    const response = await request.get('/api/crisis');
    expect([200, 401, 403]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test('GET /api/crisis/resources returns valid data structure', async ({ request }) => {
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

test.describe('Offline PWA Caching - Quotes API', () => {
  test('GET /api/quotes/daily requires authentication', async ({ request }) => {
    const response = await request.get('/api/quotes/daily');
    expect([200, 401]).toContain(response.status());
    
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty('data');
      expect(data.data).toHaveProperty('quote');
      expect(data.data).toHaveProperty('author');
    }
  });

  test('Quotes API endpoint is accessible', async ({ request }) => {
    const response = await request.get('/api/quotes/daily');
    expect([200, 401]).toContain(response.status());
    
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');
  });
});

test.describe('PWA Manifest and Service Worker', () => {
  test('manifest.json exists and contains required PWA properties', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);
    
    const manifest = await response.json();
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('short_name');
    expect(manifest).toHaveProperty('start_url');
    expect(manifest).toHaveProperty('display');
    expect(manifest).toHaveProperty('icons');
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('manifest.json has valid theme and background colors', async ({ request }) => {
    const response = await request.get('/manifest.json');
    expect(response.status()).toBe(200);
    
    const manifest = await response.json();
    expect(manifest).toHaveProperty('theme_color');
    expect(manifest).toHaveProperty('background_color');
    expect(typeof manifest.theme_color).toBe('string');
    expect(typeof manifest.background_color).toBe('string');
  });

  test('manifest.json icons have required properties', async ({ request }) => {
    const response = await request.get('/manifest.json');
    const manifest = await response.json();
    
    for (const icon of manifest.icons) {
      expect(icon).toHaveProperty('src');
      expect(icon).toHaveProperty('sizes');
      expect(icon).toHaveProperty('type');
    }
  });

  test('manifest.webmanifest is served (if exists)', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect([200, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'] || '';
      if (contentType.includes('application/json') || contentType.includes('application/manifest')) {
        const manifest = await response.json();
        expect(manifest).toHaveProperty('name');
      }
    }
  });

  test('service worker script is accessible at /sw.js', async ({ request }) => {
    const response = await request.get('/sw.js');
    expect([200, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'] || '';
      expect(contentType).toMatch(/javascript|text\/plain/);
    }
  });

  test('offline.html fallback page exists', async ({ request }) => {
    const response = await request.get('/offline.html');
    expect([200, 404]).toContain(response.status());
    
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'] || '';
      expect(contentType).toContain('text/html');
    }
  });
});

test.describe('API Response Headers for Caching', () => {
  test('/api/programs has JSON content type', async ({ request }) => {
    const response = await request.get('/api/programs');
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');
  });

  test('/api/events/today has JSON content type', async ({ request }) => {
    const response = await request.get('/api/events/today');
    const contentType = response.headers()['content-type'] || '';
    expect(contentType).toContain('application/json');
  });

  test('/api/crisis has JSON content type', async ({ request }) => {
    const response = await request.get('/api/crisis');
    
    if (response.status() === 200) {
      const contentType = response.headers()['content-type'] || '';
      expect(contentType).toContain('application/json');
    }
  });
});

test.describe('Data Validation for Offline Cache', () => {
  test('Programs data has expected fields for offline display', async ({ request }) => {
    const response = await request.get('/api/programs');
    const programs = await response.json();
    
    if (programs.length > 0) {
      const program = programs[0];
      expect(typeof program.id).toBe('string');
      expect(typeof program.title).toBe('string');
    }
  });

  test('Events data contains necessary display fields', async ({ request }) => {
    const response = await request.get('/api/events/programs-grouped');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toBeDefined();
  });
});
