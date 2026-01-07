import { defineConfig, devices } from '@playwright/test';

const localUrl = 'http://localhost:5000';

function getBaseUrl() {
  // Always prefer explicit BASE_URL, default to localhost for safety
  // Never default to production to prevent accidental data mutations
  if (process.env.BASE_URL) return process.env.BASE_URL;
  return localUrl;
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: getBaseUrl(),
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'api-only',
      testMatch: /(api-health|guardian-consent|ximi-chat|research-consent|offline-sync|consent-enforcement|portal-tests)\.spec\.ts/,
      use: {
        baseURL: localUrl,
      },
    },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.REPL_ID ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
