import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Emulator-backed tests (*.emulator.test.ts). Run via
// `npm run test:emulator`, which wraps `firebase emulators:exec` so the
// Firestore + RTDB emulators are up. Kept separate from the default
// `npm test` so the fast unit suite never needs Java/emulators.
export default defineConfig({
  test: {
    include: ["src/**/*.emulator.test.ts"],
    environment: "node",
    globals: false,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
      "server-only": resolve(__dirname, "./src/test/empty-module.ts"),
    },
  },
});
