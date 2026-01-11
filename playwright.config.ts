import { defineConfig, devices } from '@playwright/test';

const localUrl = 'http://localhost:5000';

function getBaseUrl() {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  return localUrl;
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 0 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }], ['list']],
  timeout: 30000,
  use: {
    baseURL: getBaseUrl(),
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'api-only',
      testMatch: /.*\.spec\.ts/,
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
