import {defineConfig} from '@playwright/test'

export default defineConfig({
  testDir: './test/ui',
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  timeout: 30000,
  reporter: [['list'], ['html', {open: 'never'}]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {name: 'desktop', use: {viewport: {width: 1440, height: 900}}},
    {
      name: 'mobile',
      use: {
        viewport: {width: 390, height: 844},
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'node scripts/ui-server.mjs',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 15000,
  },
})
