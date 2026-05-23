#!/usr/bin/env node
// Fix three README shots: 01-landing (was blank — capture before paint),
// 12-drill-safeguarding & 13-drill-intervention (were the full tall panel —
// crop to the relevant region so they're not "a long page").
//
//   SIM_EMAIL=… SIM_PASSWORD=… SIM_CLASS_ID=… node scripts/capture-fix.mjs

import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "../docs/screenshots");
const BASE = process.env.BASE_URL || "http://localhost:3000";
const SIM_EMAIL = process.env.SIM_EMAIL;
const SIM_PASSWORD = process.env.SIM_PASSWORD || "simulate!23";
const SIM_CLASS_ID = process.env.SIM_CLASS_ID;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

const clipShot = async (name, clip) => {
  await page.screenshot({ path: resolve(outDir, `${name}.png`), clip });
  console.log(`  ✓ ${name}.png (clip ${Math.round(clip.height)}px)`);
};

try {
  // ── 01-landing — wait for the hero to actually paint ──────────────
  await page.setViewportSize({ width: 1440, height: 1240 });
  await page.goto(`${BASE}/`);
  await page.waitForLoadState("networkidle");
  await page.getByText("teaching instrument", { exact: false }).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: resolve(outDir, "01-landing.png"), fullPage: false });
  console.log("  ✓ 01-landing.png (hero)");
  await page.setViewportSize({ width: 1440, height: 900 });

  // ── sign in ───────────────────────────────────────────────────────
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', SIM_EMAIL);
  await page.fill('input[type="password"]', SIM_PASSWORD);
  await page.click('button[type="submit"]:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 90000 });

  const openClass = async () => {
    await page.goto(`${BASE}/class/${SIM_CLASS_ID}`);
    await page.waitForLoadState("networkidle");
    await page.getByText("Class pulse").first().waitFor({ timeout: 30000 });
    await page.locator('button:has-text("Open")').first().waitFor({ timeout: 30000 });
  };

  // ── 12-drill-safeguarding — top of the panel (alert + Right now) ──
  await openClass();
  await page.locator('button:has-text("Sophie")').first().click();
  await page.locator("aside").first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(800);
  let box = await page.locator("aside").first().boundingBox();
  await clipShot("12-drill-safeguarding", {
    x: box.x,
    y: box.y,
    width: box.width,
    height: Math.min(box.height, 600),
  });

  // ── 13-drill-intervention — the "Intervene" region with a hint ────
  await openClass();
  await page.locator('button:has-text("Tom Reeves")').first().click();
  await page.locator("aside").first().waitFor({ timeout: 15000 });
  await page.locator('button:has-text("Send a teacher hint")').first().click();
  await page.waitForTimeout(400);
  const hint = page.locator('textarea[placeholder*="hint"]').first();
  await hint.fill("Think about what chlorophyll does with the green light — does it absorb it, or reflect it?");
  await page.waitForTimeout(300);
  const intervene = page.getByText("Intervene", { exact: true }).first();
  await intervene.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  box = await page.locator("aside").first().boundingBox();
  const iv = await intervene.boundingBox();
  await clipShot("13-drill-intervention", {
    x: box.x,
    y: Math.max(0, iv.y - 16),
    width: box.width,
    height: 470,
  });

  console.log("\n✓ Fixes captured.");
} catch (err) {
  console.error("\n✗ FAILED:", err.message);
  process.exitCode = 1;
} finally {
  await browser.close().catch(() => {});
  process.exit(process.exitCode ?? 0);
}
