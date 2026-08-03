import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  // 60s, not Playwright's 30s default. These specs drive several signed-in
  // actors through multi-step journeys against a dev server that compiles
  // routes on first visit, and a handful of them (roster-management's
  // cross-tenant test, full-flow) were finishing in the mid-to-high 20s --
  // close enough that which test tipped over changed run to run, on no code
  // change at all. A timeout that only fails intermittently teaches people to
  // re-run rather than to read the failure.
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
})
