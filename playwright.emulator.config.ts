import { defineConfig, devices } from "@playwright/test";

// Emulator-backed demo-flow e2e (pupil-join, productive-struggle/B1, …).
// Run under the Firebase emulator suite, which sets the *_EMULATOR_HOST env
// vars firebase-admin reads:
//   firebase emulators:exec --only auth,firestore,database \
//     "playwright test -c playwright.emulator.config.ts"
// (wrapped by the `test:e2e` npm script). The dev server runs in emulator
// mode (NEXT_PUBLIC_FIREBASE_EMULATOR=1) so the client SDK talks to the same
// seeded, isolated backend — no live project, no real-pupil data.
export default defineConfig({
  testDir: "e2e",
  testMatch: ["**/*.emulator.spec.ts"],
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // Set the client emulator flag INLINE in the command so it reliably
    // reaches the Next dev server (env-object propagation proved flaky). The
    // admin host vars (FIRESTORE_/AUTH_/DATABASE_EMULATOR_HOST) come from the
    // surrounding `firebase emulators:exec` and are inherited by this shell.
    command: "NEXT_PUBLIC_FIREBASE_EMULATOR=1 npm run dev",
    url: "http://localhost:3000",
    // Never reuse an existing server — a stale live-mode dev server would
    // make the app talk to the live project instead of the emulator.
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
