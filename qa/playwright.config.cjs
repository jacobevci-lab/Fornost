const path = require('node:path');
const { defineConfig } = require('@playwright/test');

const baseURL = process.env.QA_BASE_URL || 'http://127.0.0.1:8788';
const externalTarget = Boolean(process.env.QA_BASE_URL);

module.exports = defineConfig({
  testDir: __dirname,
  testMatch: 'site.spec.cjs',
  timeout: 30000,
  expect: { timeout: 8000 },
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: process.env.QA_REPORT_DIR || 'qa-report', open: 'never' }]
  ],
  use: {
    baseURL,
    browserName: 'chromium',
    headless: true,
    ignoreHTTPSErrors: false,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure'
  },
  webServer: externalTarget ? undefined : {
    command: 'python3 -m http.server 8788 --directory public',
    cwd: path.resolve(__dirname, '..'),
    url: 'http://127.0.0.1:8788',
    reuseExistingServer: false,
    timeout: 15000
  }
});
