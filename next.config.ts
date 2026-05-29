import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,

  // ── Images: serve straight from the CDN, never through the optimizer ──
  // Every image asset is a local, already-sized, already-compressed WebP/PNG
  // (public/img, public/crest.png). next/image's default loader rewrites src
  // to /_next/image, which on Firebase hosting hits the cold-start-prone SSR
  // Cloud Run function — so above-the-fold images rendered with a long delay
  // despite being tiny. Disabling optimization serves the static files
  // directly from the hosting CDN. The optimizer offers no benefit here since
  // the assets are pre-optimized.
  images: {
    unoptimized: true,
  },

  // ── External packages on the server ───────────────────────────────
  // firebase-admin must NOT be bundled. Turbopack (Next 16's default)
  // mangles unbundled module names with a hash suffix when it does
  // bundle them, which made the deployed Cloud Function fail at
  // runtime with:
  //   "Cannot find package 'firebase-admin-a14c8a5423a75469'"
  // The fix: tell Next to treat firebase-admin (and friends) as
  // server externals so they stay as plain `require("firebase-admin")`
  // resolved from node_modules at runtime. firebase-admin's native
  // dependencies (grpc bindings, gcp-metadata, jsonwebtoken) hate
  // being bundled anyway.
  serverExternalPackages: [
    "firebase-admin",
    "@google-cloud/firestore",
    "@google-cloud/storage",
    "@google-cloud/database",
    "@google/genai",
  ],
};

export default config;
