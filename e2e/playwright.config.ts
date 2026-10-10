import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests run against the real stack:  docker compose up -d  (+ seed, see README).
 * They never mock the API; only third-party placeholder images are stubbed (offline/deterministic).
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // journeys share seeded data (one creates a lead, the next works it)
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
