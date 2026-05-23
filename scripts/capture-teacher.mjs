#!/usr/bin/env node
// Focused screenshot capture for the REDESIGNED teacher surfaces (dashboard +
// live class view + drill panel). Drives the real dev server signed in as a
// simulated teacher, against a populated sim class, so the shots show real
// classifier output. Selectors match the post-redesign UI (one-action command
// bar with an overflow menu; collapsed appraisal disclosure).
//
//   - `npm run dev` running on http://localhost:3000
//   - a populated sim class (`node scripts/simulate-class.mjs --personas 6 --keep`)
//
// Usage:
//   SIM_EMAIL=… SIM_PASSWORD=… SIM_CLASS_ID=… node scripts/capture-teacher.mjs
//
// Output: docs/screenshots/{05-dashboard,10-class-detail,11-class-detail-plan,
//                            12-drill-safeguarding,13-drill-intervention}.png

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
  console.error("Need SIM_EMAIL + SIM_CLASS_ID (+ SIM_PASSWORD).");
  process.exit(1);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

async function shot(name, opts = {}) {
  await page.screenshot({ path: resolve(outDir, `${name}.png`), fullPage: opts.fullPage ?? false });
  console.log(`  ✓ ${name}.png`);
}
async function shotEl(selector, name) {
  const el = page.locator(selector).first();
  await el.screenshot({ path: resolve(outDir, `${name}.png`) });
  console.log(`  ✓ ${name}.png (element)`);
}

try {
  // Make the lesson read as live so the command bar + status are realistic.
  await adminRtdb.ref(`liveSessions/${SIM_CLASS_ID}/status`).set({ value: "active", ts: Date.now(), wrapUpNote: null });

  // Sign in
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', SIM_EMAIL);
  await page.fill('input[type="password"]', SIM_PASSWORD);
  await page.click('button[type="submit"]:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 45000 });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await shot("05-dashboard", { fullPage: true });

  // Live class view — wait for real content (the pulse + cards) before shooting,
  // so we never capture a half-loaded blank page.
  await page.goto(`${BASE}/class/${SIM_CLASS_ID}`);
  await page.waitForLoadState("networkidle");
  await page.getByText("Class pulse").first().waitFor({ timeout: 30000 });
  await page.locator('button:has-text("Open")').first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot("10-class-detail", { fullPage: true });

  // Expand the lesson plan accordion
  const planBtn = page.locator('button:has-text("Lesson plan")').first();
  if (await planBtn.count()) {
    await planBtn.click();
    await page.waitForTimeout(600);
    await shot("11-class-detail-plan", { fullPage: true });
    await planBtn.click();
    await page.waitForTimeout(400);
  }

  // Safeguarding drill — Sophie Renton
  const sophie = page.locator('button:has-text("Sophie")').first();
  if (await sophie.count()) {
    await sophie.click();
    await page.waitForTimeout(1000);
    await shotEl("aside", "12-drill-safeguarding");
    const close = page.locator('aside button[aria-label="Close"]').first();
    if (await close.count()) {
      await close.click();
      await page.waitForTimeout(400);
    }
  }

  // Intervention drill — Tom Reeves, composing a teacher hint
  const tom = page.locator('button:has-text("Tom Reeves")').first();
  if (await tom.count()) {
    await tom.click();
    await page.waitForTimeout(900);
    const hintBtn = page.locator('button:has-text("Send a teacher hint")').first();
    if (await hintBtn.count()) {
      await hintBtn.click();
      await page.waitForTimeout(400);
      const hintArea = page.locator('textarea[placeholder*="hint"]').first();
      if (await hintArea.count()) {
        await hintArea.fill("Think about what chlorophyll does with the green light — does it absorb it, or reflect it?");
        await page.waitForTimeout(300);
      }
    }
    await shotEl("aside", "13-drill-intervention");
  }

  console.log("\n✓ Teacher screenshots captured.");
} catch (err) {
  console.error("\n✗ FAILED:", err.message);
  process.exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  process.exit(process.exitCode ?? 0);
}
