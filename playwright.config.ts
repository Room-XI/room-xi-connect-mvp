import { defineConfig, devices } from '@playwright/test';

const isReplit = process.env.REPL_ID || process.env.REPLIT_DEPLOYMENT;
const productionUrl = 'https://room-xi-connect.replit.app';
const localUrl = 'http://localhost:5000';

function getBaseUrl() {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  return productionUrl;
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: isReplit ? localUrl : getBaseUrl(),
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'api-only',
      testMatch: /api-health\.spec\.ts/,
      use: {
        baseURL: localUrl,
      },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: isReplit ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
