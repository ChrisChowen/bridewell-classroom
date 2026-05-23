import { defineConfig, devices } from "@playwright/test";

// Playwright e2e + accessibility harness. Kept in `e2e/` so it never
// collides with the vitest unit suite (`src/**/*.test.ts`). The a11y specs
// run against the auth-free public pages today; the full demo-flow specs
// (B1, wheel-spinning, safeguarding, teacher-flow, pupil-join) need the
// Firebase emulator seeded — see reports/blocked.md.
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Boot the app for local runs; in CI a built server is started the same way.
  // First Next dev compile per route is slow, so allow a generous startup.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
