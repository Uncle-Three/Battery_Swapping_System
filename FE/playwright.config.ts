import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5174', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'npm run dev', cwd: '../../BE', env: { NODE_ENV: 'test', E2E_TEST: 'true', PORT: '5100', CORS_ORIGIN: 'http://localhost:5174' }, url: 'http://127.0.0.1:5100/api/v1/health', reuseExistingServer: false, timeout: 120_000 },
    { command: 'npm run dev -- --host localhost --port 5174', env: { VITE_API_URL: 'http://localhost:5100/api' }, url: 'http://localhost:5174', reuseExistingServer: false, timeout: 120_000 },
  ],
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
