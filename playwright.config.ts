import { defineConfig, devices } from "@playwright/test";

const remote = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  // Keep generated artifacts out of the source tree.
  outputDir: process.env.E2E_OUTPUT_DIR ?? "/tmp/blindspot-playwright-results",
  use: {
    baseURL: remote ?? "http://localhost:3000",
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    reducedMotion: "reduce",
  },
  projects: [
    { name: "chromium", testIgnore: "**/mobile.spec.ts", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile-chromium",
      testMatch: "**/mobile.spec.ts",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: remote ? undefined : {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
