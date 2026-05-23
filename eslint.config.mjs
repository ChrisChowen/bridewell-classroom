import { FlatCompat } from "@eslint/eslintrc";

// Flat config (ESLint 9). `next lint` was previously unconfigured and would
// prompt interactively — making it useless in CI and locally. This pins the
// Next recommended rule sets so `npm run lint` is deterministic.
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      ".firebase/**",
      "out/**",
      "build/**",
      "dist/**",
      "coverage/**",
      "node_modules/**",
      "next-env.d.ts",
      // One-off scripts + JS tooling are not part of the typed app surface.
      "scripts/**",
      "*.config.*",
      "**/*.config.mjs",
    ],
  },
];

export default eslintConfig;
