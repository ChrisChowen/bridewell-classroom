#!/usr/bin/env node
// Capture README screenshots against the populated sim class.
//
// Pre-requisite: a sim class is live in Firebase (run
//   `node scripts/simulate-class.mjs --personas 6 --turns 6 --keep`
// to populate one, then read the teacher email/password + class id from
// the last few lines of the sim's stdout). Pass them via env vars:
//
//   SIM_EMAIL=...  SIM_PASSWORD=...  SIM_CLASS_ID=...  node scripts/capture-screenshots.mjs
//
// Output goes to docs/screenshots/. Re-run any time to refresh.

import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, "../docs/screenshots");
mkdirSync(outDir, { recursive: true });

const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=").map((s) => s.trim()))
);

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SIM_EMAIL = process.env.SIM_EMAIL;
const SIM_PASSWORD = process.env.SIM_PASSWORD || "simulate!23";
const SIM_CLASS_ID = process.env.SIM_CLASS_ID;
const SIM_JOIN_CODE = process.env.SIM_JOIN_CODE;

if (!SIM_EMAIL) {
  console.warn("⚠ SIM_EMAIL not set — only public/unauth screens will be captured.");
}

async function shot(page, name, opts = {}) {
  const file = resolve(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? false });
  console.log(`  ✓ ${name}.png`);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
});

try {
  // 1. Landing
  {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`);
    await page.waitForLoadState("networkidle");
    await shot(page, "01-landing", { fullPage: true });
    await page.close();
  }

  // 2. Sign-in
  {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/login`);
    await page.waitForLoadState("networkidle");
    await shot(page, "02-login");
    await page.close();
  }

  // 3. Pupil join
  {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/join`);
    await page.waitForLoadState("networkidle");
    await shot(page, "03-join");
    await page.close();
  }

  // 4. Design preview (seeded data — design sense-check)
  {
    const page = await ctx.newPage();
    await page.goto(`${BASE}/demo`);
    await page.waitForLoadState("networkidle");
    await shot(page, "04-demo-preview", { fullPage: true });
    await page.close();
  }

  if (!SIM_EMAIL) {
    console.log("\nSkipping auth-gated screenshots — set SIM_EMAIL.");
    await browser.close();
    process.exit(0);
  }

  // 5-N — authed teacher screenshots
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");
  // Click Sign in tab if needed (default is sign-in)
  await page.fill('input[type="email"]', SIM_EMAIL);
  await page.fill('input[type="password"]', SIM_PASSWORD);
  await page.click('button[type="submit"]:has-text("Sign in")');
  await page.waitForURL("**/dashboard", { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  await shot(page, "05-dashboard", { fullPage: true });

  // Click "New class" wizard
  await page.click('button:has-text("New class")');
  await page.waitForTimeout(400);
  await shot(page, "06-wizard-pick", { fullPage: false });

  // Click the photosynthesis tile (target the button containing the topic title)
  await page.locator('button:has-text("Photosynthesis")').first().click();
  await page.waitForTimeout(800);
  await shot(page, "07-wizard-describe", { fullPage: false });

  // Close the wizard
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);

  if (SIM_CLASS_ID) {
    // Class detail page
    await page.goto(`${BASE}/class/${SIM_CLASS_ID}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await shot(page, "08-class-detail", { fullPage: true });

    // Open the lesson plan accordion + screenshot
    await page.click('button:has-text("Lesson plan")');
    await page.waitForTimeout(400);
    await shot(page, "09-class-detail-plan", { fullPage: true });

    // Click the first pupil card to open the drill panel
    const cards = await page.locator('button.bw-card').elementHandles();
    if (cards.length > 0) {
      await cards[0].click();
      await page.waitForTimeout(1000);
      await shot(page, "10-pupil-drill", { fullPage: false });
    }
  }

  // Pupil session preview (anon — but we need a class to render the chat)
  if (SIM_JOIN_CODE) {
    const pupil = await ctx.newPage();
    await pupil.goto(`${BASE}/join`);
    await pupil.waitForLoadState("networkidle");
    await pupil.fill('input[placeholder*="PHO"]', SIM_JOIN_CODE);
    await pupil.fill('input[placeholder*="First name"]', "Screenshot Sam");
    await pupil.click('button:has-text("Join lesson")');
    await pupil.waitForURL("**/session", { timeout: 15000 });
    await pupil.waitForLoadState("networkidle");
    await pupil.waitForTimeout(1200);
    await shot(pupil, "11-pupil-session");
    await pupil.close();
  }

  await page.close();
  await browser.close();
  console.log("\n✓ Screenshots saved to docs/screenshots/");
} catch (err) {
  console.error("\n✗ FAILED:", err.message);
  await browser.close();
  process.exit(1);
}
