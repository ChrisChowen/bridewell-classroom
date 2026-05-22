#!/usr/bin/env node
// Quick capture for the remaining states: the appraisal panel + the
// classroom display + the pupil closing-screen loading state.
//
// Env:  SIM_EMAIL, SIM_PASSWORD, SIM_CLASS_ID, SIM_JOIN_CODE

import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "../docs/screenshots");
mkdirSync(outDir, { recursive: true });

const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
);
const sa = JSON.parse(readFileSync(resolve(__dirname, "../secrets/firebase-admin.json"), "utf8"));
const admin = initializeApp({ credential: cert(sa), databaseURL: env.NEXT_PUBLIC_FIREBASE_DATABASE_URL });
const adminRtdb = getDatabase(admin);

const BASE = "http://localhost:3000";
const SIM_EMAIL = process.env.SIM_EMAIL;
const SIM_PASSWORD = process.env.SIM_PASSWORD;
const SIM_CLASS_ID = process.env.SIM_CLASS_ID;
const SIM_JOIN_CODE = process.env.SIM_JOIN_CODE;

async function shot(page, name, opts = {}) {
  const file = resolve(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? false });
  console.log(`  ✓ ${name}.png`);
}

const browser = await chromium.launch();

try {
  // First, make sure the sim class is in ended state so the appraisal
  // panel renders.
  console.log("Setting sim class status → ended");
  await adminRtdb.ref(`liveSessions/${SIM_CLASS_ID}/status`).set({
    value: "ended",
    ts: Date.now(),
    wrapUpNote: null,
  });

  // === 19: pupil closing screen — the loading state IS a valid product state ===
  console.log("\n19 — pupil closing screen (loading state)");
  const pCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const pPage = await pCtx.newPage();
  await pPage.goto(`${BASE}/join`);
  await pPage.waitForLoadState("networkidle");
  await pPage.locator('input').nth(0).fill(SIM_JOIN_CODE);
  await pPage.locator('input').nth(1).fill("Alex");
  await pPage.click('button:has-text("Join lesson")');
  // Will go directly to /session and see the ended status → ClosingScreen
  await pPage.waitForURL("**/session", { timeout: 20_000 });
  await pPage.waitForLoadState("networkidle");
  // Wait for the closing screen container to render
  await pPage.waitForSelector('text=/Wrapping up your lesson|What you showed today|Lesson ended/', { timeout: 30_000 });
  await pPage.waitForTimeout(2000); // give the AI consolidation a head-start; capture whatever it shows
  await shot(pPage, "19-pupil-closing", { fullPage: true });
  await pCtx.close();

  // === 20: teacher appraisal panel — pre-generation state ===
  console.log("\n20 — appraisal panel");
  const tCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const tPage = await tCtx.newPage();
  await tPage.goto(`${BASE}/login`);
  await tPage.waitForLoadState("networkidle");
  await tPage.fill('input[type="email"]', SIM_EMAIL);
  await tPage.fill('input[type="password"]', SIM_PASSWORD);
  await tPage.click('button[type="submit"]:has-text("Sign in")');
  await tPage.waitForURL("**/dashboard", { timeout: 20_000 });
  await tPage.goto(`${BASE}/class/${SIM_CLASS_ID}`);
  await tPage.waitForLoadState("networkidle");
  await tPage.waitForTimeout(1200);
  await tPage.waitForSelector('button:has-text("Generate appraisal")', { timeout: 15_000 });
  await tPage.waitForTimeout(800);
  // First: pre-generation state (calmer screenshot, no spinner)
  await shot(tPage, "20-appraisal-prompt", { fullPage: true });
  // Then click and try to capture the populated state — best effort.
  await tPage.click('button:has-text("Generate appraisal")');
  try {
    await tPage.waitForSelector('text=/AI appraisal of this plan/', { timeout: 60_000 });
    await tPage.waitForTimeout(1500);
    await shot(tPage, "20-appraisal", { fullPage: true });
  } catch {
    console.log("    (skipping populated appraisal — generation took too long)");
  }
  await tCtx.close();

  // === 21: classroom display ===
  console.log("\n21 — classroom display");
  const cCtx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const cPage = await cCtx.newPage();
  // The Field needs a classId to read the names-stripped aggregate; without one
  // it renders the empty "open from the class detail page" entry state.
  await cPage.goto(
    `${BASE}/classroom?classId=${SIM_CLASS_ID}&title=${encodeURIComponent("Photosynthesis: The Power of Light")}&steps=4&class=${encodeURIComponent("Year 8 · Set 2")}&code=${SIM_JOIN_CODE}`
  );
  await cPage.waitForLoadState("networkidle");
  await cPage.waitForTimeout(1500);
  await shot(cPage, "21-classroom-display", { fullPage: true });
  await cCtx.close();

  // Restore sim class status so it's reusable.
  await adminRtdb.ref(`liveSessions/${SIM_CLASS_ID}/status`).remove().catch(() => {});

  await browser.close();
  console.log("\n✓ Done.");
} catch (err) {
  console.error("\n✗ FAILED:", err.message);
  await browser.close().catch(() => {});
  // Always restore status on failure too.
  await adminRtdb.ref(`liveSessions/${SIM_CLASS_ID}/status`).remove().catch(() => {});
  process.exitCode = 1;
}
