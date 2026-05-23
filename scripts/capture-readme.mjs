#!/usr/bin/env node
// Re-capture the README screenshots that were oversized or stale:
//  - login / register / join: tight element crops (were small cards lost in a
//    1440×900 frame)
//  - landing: hero + preview only (was a full marketing-page capture)
//  - dashboard: viewport crop
//  - 20-appraisal: a REAL generated appraisal report (ends the class, expands
//    the "After the lesson" disclosure, generates, retries past LLM fallback)
//
// Usage:
//   SIM_EMAIL=… SIM_PASSWORD=… SIM_CLASS_ID=… node scripts/capture-readme.mjs

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

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SIM_EMAIL = process.env.SIM_EMAIL;
const SIM_PASSWORD = process.env.SIM_PASSWORD || "simulate!23";
const SIM_CLASS_ID = process.env.SIM_CLASS_ID;
if (!SIM_EMAIL || !SIM_CLASS_ID) {
  console.error("Need SIM_EMAIL + SIM_CLASS_ID.");
  process.exit(1);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

async function shotEl(selector, name) {
  await page.locator(selector).first().screenshot({ path: resolve(outDir, `${name}.png`) });
  console.log(`  ✓ ${name}.png (crop)`);
}
async function shotView(name) {
  await page.screenshot({ path: resolve(outDir, `${name}.png`), fullPage: false });
  console.log(`  ✓ ${name}.png (viewport)`);
}

try {
  // ── Public, cropped ───────────────────────────────────────────────
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await shotEl(".bw-card", "02-login");
  await page.click('button:has-text("Register")');
  await page.waitForTimeout(400);
  await shotEl(".bw-card", "02b-register");

  await page.goto(`${BASE}/join`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  await shotEl(".bw-card", "03-join");

  // Landing: hero + preview cards only (taller viewport, not the whole page).
  await page.setViewportSize({ width: 1440, height: 1280 });
  await page.goto(`${BASE}/`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(600);
  await shotView("01-landing");
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── Signed in ─────────────────────────────────────────────────────
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', SIM_EMAIL);
  await page.fill('input[type="password"]', SIM_PASSWORD);
  await page.click('button[type="submit"]:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 90000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1200);
  await shotView("05-dashboard");

  // ── Appraisal: end the class, expand the disclosure, generate ──────
  await adminRtdb.ref(`liveSessions/${SIM_CLASS_ID}/status`).set({ value: "ended", ts: Date.now(), wrapUpNote: null });

  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    console.log(`Appraisal attempt ${attempt}…`);
    await page.goto(`${BASE}/class/${SIM_CLASS_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    // Expand the "After the lesson" disclosure.
    const disc = page.locator('button:has-text("Appraise this lesson plan")').first();
    await disc.waitFor({ timeout: 20000 });
    await disc.click();
    await page.waitForTimeout(500);
    const gen = page.locator('button:has-text("Generate appraisal")').first();
    await gen.waitFor({ timeout: 10000 });
    await gen.click();
    try {
      await page.waitForSelector('[data-testid="appraisal-result"]', { timeout: 90000 });
      const fallback = await page.locator('text=/Appraisal generator was unavailable/').count();
      if (fallback === 0) {
        await page.waitForTimeout(1000);
        await page.locator('[data-testid="appraisal-result"]').screenshot({ path: resolve(outDir, "20-appraisal.png") });
        console.log(`  ✓ 20-appraisal.png — real report (attempt ${attempt})`);
        ok = true;
      } else {
        console.log(`  attempt ${attempt}: LLM fallback — retrying`);
      }
    } catch (e) {
      console.log(`  attempt ${attempt}: ${String(e.message).slice(0, 80)}`);
    }
  }
  if (!ok) console.log("  Appraisal: all attempts hit fallback — left existing image.");

  console.log("\n✓ README captures done.");
} catch (err) {
  console.error("\n✗ FAILED:", err.message);
  process.exitCode = 1;
} finally {
  await adminRtdb.ref(`liveSessions/${SIM_CLASS_ID}/status`).remove().catch(() => {});
  await browser.close().catch(() => {});
  process.exit(process.exitCode ?? 0);
}
