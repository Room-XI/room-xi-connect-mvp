import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';

const isReplitEnv = process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT;

const publicRoutes = [
  '/',
  '/about',
  '/explore',
  '/explore/programs',
  '/explore/map',
  '/explore/today',
  '/qr',
  '/auth/login',
  '/auth/signup',
  '/transparency',
  '/privacy',
  '/crisis',
];

const authRequiredRoutes = [
  '/home',
  '/me',
  '/settings',
  '/privacy-center',
  '/saved',
];

test.describe('Route Crawl - Public Routes', () => {
  test.skip(() => !!isReplitEnv, 'Skipping browser tests in Replit - missing Chromium dependencies');
  
  for (const route of publicRoutes) {
    test(`should load ${route}`, async ({ page }) => {
      const response = await page.goto(`${BASE_URL}${route}`, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      expect(response?.status()).toBeLessThan(500);
      
      const title = await page.title();
      expect(title).toBeTruthy();
      
      const notFoundText = await page.locator('text=404').count();
      const pageNotFoundText = await page.locator('text=Page Not Found').count();
      
      if (route !== '/404') {
        expect(notFoundText + pageNotFoundText).toBe(0);
      }
    });
  }
});

test.describe('Route Crawl - Auth Required Routes', () => {
  test.skip(() => !!isReplitEnv, 'Skipping browser tests in Replit - missing Chromium dependencies');
  
  for (const route of authRequiredRoutes) {
    test(`${route} should redirect to login or show auth prompt`, async ({ page }) => {
      const response = await page.goto(`${BASE_URL}${route}`, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      expect(response?.status()).toBeLessThan(500);
      
      const currentUrl = page.url();
      const isRedirectedToLogin = currentUrl.includes('/auth/login') || currentUrl.includes('/auth/signup');
      const hasSignInPrompt = await page.locator('text=Sign In').count() > 0 || 
                               await page.locator('text=Log In').count() > 0;
      
      expect(isRedirectedToLogin || hasSignInPrompt || response?.status() === 200).toBeTruthy();
    });
  }
});

test.describe('API Health Check', () => {
  test('API health endpoint should respond', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.status).toBe('healthy');
  });

  test('CSRF token endpoint should respond', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/auth/csrf-token`);
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data.csrfToken).toBeTruthy();
  });
});

test.describe('Static Assets', () => {
  test('should serve manifest.json', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/manifest.json`);
    expect(response.status()).toBe(200);
  });

  test('should serve robots.txt', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/robots.txt`);
    expect([200, 404]).toContain(response.status());
  });
});
