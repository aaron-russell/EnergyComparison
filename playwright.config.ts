import { defineConfig, devices } from '@playwright/test';

const e2ePort = process.env.E2E_PORT ?? '4173';
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${e2ePort}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  timeout: 60000,
  use: {
    baseURL,
    trace: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: `npm run preview -- --port ${e2ePort}`,
          url: `http://127.0.0.1:${e2ePort}`,
          reuseExistingServer: !process.env.CI,
        },
      }),
});
