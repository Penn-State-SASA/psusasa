import { defineConfig, devices } from "@playwright/test";

// Smoke tests only. Every test must be turned away before the app writes to
// Airtable or creates a charge — a local run uses the real keys in
// .env.local, so the suite has to be harmless against real services.
//
// PLAYWRIGHT_BASE_URL points the suite at an already-running server and
// skips starting one.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: isCI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      // Door staff run check-in from their phones.
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      // API checks don't involve a browser; once is enough.
      testIgnore: /api\.spec\.ts/,
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        // CI builds in its own step first, so a build failure reads as one.
        command: isCI ? "npm run start" : "npm run dev",
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 120_000,
      },
});
