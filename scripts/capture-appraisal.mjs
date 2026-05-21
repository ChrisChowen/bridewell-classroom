#!/usr/bin/env node
// Retry the appraisal capture — previous attempt landed on the LLM
// fallback. The AppraisalPanel state is local, so a page reload gives
// us a fresh "Generate appraisal" button. We try up to 3 times.

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

await adminRtdb.ref(`liveSessions/${SIM_CLASS_ID}/status`).set({
  value: "ended", ts: Date.now(), wrapUpNote: null,
});

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();

try {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', SIM_EMAIL);
  await page.fill('input[type="password"]', SIM_PASSWORD);
  await page.click('button[type="submit"]:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 20_000 });

  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    console.log(`Attempt ${attempt}…`);
    await page.goto(`${BASE}/class/${SIM_CLASS_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    await page.waitForSelector('button:has-text("Generate appraisal")', { timeout: 20_000 });
    await page.click('button:has-text("Generate appraisal")');
    try {
      await page.waitForSelector('text=/AI appraisal of this plan/', { timeout: 90_000 });
      // Now check whether the rendered text looks like a real
      // appraisal — i.e. NOT the fallback "Appraisal generator was
      // unavailable".
      const summary = await page.locator('text=/Appraisal generator was unavailable/').count();
      if (summary === 0) {
        await page.waitForTimeout(1200);
        const file = resolve(outDir, "20-appraisal.png");
        await page.screenshot({ path: file, fullPage: true });
        console.log(`  ✓ 20-appraisal.png (attempt ${attempt})`);
        ok = true;
      } else {
        console.log(`  attempt ${attempt}: LLM fallback — retrying`);
      }
    } catch (e) {
      console.log(`  attempt ${attempt}: timeout — ${e.message?.slice(0, 80)}`);
    }
  }
  if (!ok) {
    console.log("  All attempts hit the fallback — keeping the existing screenshot.");
  }
} finally {
  await adminRtdb.ref(`liveSessions/${SIM_CLASS_ID}/status`).remove().catch(() => {});
  await browser.close();
}
