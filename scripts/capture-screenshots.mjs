#!/usr/bin/env node
// Capture screenshots for the README. Drives real user flows against
// the live dev server so the screenshots include real conversations,
// real classifier output, and real Gemini-drafted lesson plans — not
// static mocked screens.
//
// Pre-requisites:
//   - `npm run dev` is running on http://localhost:3000
//   - A populated simulation class exists (`node scripts/simulate-class.mjs --personas 6 --turns 6 --keep`)
//   - That sim teacher's email + password are passed via env vars below
//
// Usage:
//   SIM_EMAIL=...  SIM_PASSWORD=...  SIM_CLASS_ID=...  SIM_JOIN_CODE=...  node scripts/capture-screenshots.mjs
//
// Output: docs/screenshots/*.png. Any test class this script creates
// gets torn down at the end; the sim class is left alone.

import { chromium } from "playwright";
import { readFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
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
const adminAuth = getAuth(admin);
const adminDb = getFirestore(admin);
const adminRtdb = getDatabase(admin);

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SIM_EMAIL = process.env.SIM_EMAIL;
const SIM_PASSWORD = process.env.SIM_PASSWORD || "simulate!23";
const SIM_CLASS_ID = process.env.SIM_CLASS_ID;
const SIM_JOIN_CODE = process.env.SIM_JOIN_CODE;

const created = { testClassId: null, testJoinCode: null, testPupilUid: null };

async function shot(page, name, opts = {}) {
  const file = resolve(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: opts.fullPage ?? false });
  console.log(`  ✓ ${name}.png`);
}

const browser = await chromium.launch();

async function newCtx() {
  return browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
}

try {
  // ============================================================
  // PART 1 — Unauth public surfaces
  // ============================================================
  console.log("\n— Part 1: public surfaces —");
  {
    const ctx = await newCtx();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/`);
    await page.waitForLoadState("networkidle");
    await shot(page, "01-landing", { fullPage: true });

    await page.goto(`${BASE}/login`);
    await page.waitForLoadState("networkidle");
    await shot(page, "02-login");

    // Register tab
    await page.click('button:has-text("Register")');
    await page.waitForTimeout(300);
    await shot(page, "02b-register");

    await page.goto(`${BASE}/join?code=${encodeURIComponent(SIM_JOIN_CODE ?? "ABC-123")}`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(400);
    await shot(page, "03-join");

    await page.goto(`${BASE}/demo`);
    await page.waitForLoadState("networkidle");
    await shot(page, "04-demo-preview", { fullPage: true });

    await ctx.close();
  }

  if (!SIM_EMAIL || !SIM_CLASS_ID || !SIM_JOIN_CODE) {
    console.log("\nSkipping auth-gated screenshots — set SIM_EMAIL + SIM_CLASS_ID + SIM_JOIN_CODE.");
    await browser.close();
    process.exit(0);
  }

  // ============================================================
  // PART 2 — Teacher signed in
  // ============================================================
  console.log("\n— Part 2: teacher surfaces —");
  const tCtx = await newCtx();
  const tPage = await tCtx.newPage();
  await tPage.goto(`${BASE}/login`);
  await tPage.waitForLoadState("networkidle");
  await tPage.fill('input[type="email"]', SIM_EMAIL);
  await tPage.fill('input[type="password"]', SIM_PASSWORD);
  await tPage.click('button[type="submit"]:has-text("Sign in")');
  await tPage.waitForURL("**/dashboard", { timeout: 20000 });
  await tPage.waitForLoadState("networkidle");
  await tPage.waitForTimeout(800);
  await shot(tPage, "05-dashboard", { fullPage: true });

  // Wizard step 1 — pick syllabus (with subject motifs now)
  await tPage.click('button:has-text("New class")');
  await tPage.waitForTimeout(700);
  await shot(tPage, "06-wizard-pick");

  // Step 2 — describe (after picking Photosynthesis)
  await tPage.locator('button:has-text("Photosynthesis")').first().click();
  await tPage.waitForTimeout(800);
  await shot(tPage, "07-wizard-describe");

  // Fill in the intent and click generate. This costs a Pro call (~18s)
  // but produces a real plan for the review screenshot.
  await tPage.fill('textarea[required]', "I want them to grasp that chlorophyll captures light energy to make glucose. Focus on why leaves look green and how the rate changes with light intensity. They have met respiration but not the word equation. 30 minutes.");
  await tPage.click('button:has-text("Generate lesson plan")');
  console.log("  …waiting for the lesson planner to return (~18s)");
  await tPage.waitForSelector('button:has-text("Approve and create class")', { timeout: 60_000 });
  await tPage.waitForTimeout(500);
  await shot(tPage, "08-wizard-review", { fullPage: true });

  // Approve → creates a class. We'll tear it down at the end.
  await tPage.click('button:has-text("Approve and create class")');
  await tPage.waitForSelector('text=Pupil join code', { timeout: 30_000 });
  await tPage.waitForTimeout(500);
  await shot(tPage, "09-wizard-done");

  // Read the join code from the page so we can reuse the class for pupil
  // capture (more deterministic than the sim class — we control it).
  const joinCodeText = await tPage.locator('text=/^[A-Z0-9]{3}-[A-Z0-9]{3}$/').first().textContent();
  created.testJoinCode = (joinCodeText ?? "").trim();
  console.log(`  test class join code: ${created.testJoinCode}`);

  // Look up the class doc by code so we can clean it up + use its id.
  if (created.testJoinCode) {
    const codeDoc = await adminDb.collection("joinCodes").doc(created.testJoinCode).get();
    if (codeDoc.exists) created.testClassId = (codeDoc.data())?.classId;
    console.log(`  test class id: ${created.testClassId}`);
  }

  // Close wizard and go to dashboard.
  await tPage.click('button[aria-label="Close"]');
  await tPage.waitForTimeout(800);

  // Class detail for the SIM class (the rich one with 6 pupils + safeguarding flag).
  await tPage.goto(`${BASE}/class/${SIM_CLASS_ID}`);
  await tPage.waitForLoadState("networkidle");
  await tPage.waitForTimeout(1200);
  await shot(tPage, "10-class-detail", { fullPage: true });

  // Expand the lesson plan accordion.
  await tPage.click('button:has-text("LESSON PLAN")');
  await tPage.waitForTimeout(500);
  await shot(tPage, "11-class-detail-plan", { fullPage: true });
  // Collapse again
  await tPage.click('button:has-text("LESSON PLAN")');
  await tPage.waitForTimeout(300);

  // Open Sophie's card (safeguarding flag is on her).
  const sophieCard = tPage.locator('button:has-text("Sophie Renton")').first();
  if ((await sophieCard.count()) > 0) {
    await sophieCard.click();
    await tPage.waitForTimeout(800);
    await shot(tPage, "12-drill-safeguarding", { fullPage: false });
    // Close
    await tPage.click('button[aria-label="Close"]');
    await tPage.waitForTimeout(400);
  }

  // Open Tom's card and open the "Send a teacher hint" inline form.
  const tomCard = tPage.locator('button:has-text("Tom Reeves")').first();
  if ((await tomCard.count()) > 0) {
    await tomCard.click();
    await tPage.waitForTimeout(600);
    // Click the intervention button
    await tPage.click('button:has-text("Send a teacher hint")');
    await tPage.waitForTimeout(400);
    // Fill the textarea so the screenshot shows a real hint being composed
    const hintArea = tPage.locator('textarea[placeholder*="hint"]');
    if ((await hintArea.count()) > 0) {
      await hintArea.fill("Think about what chlorophyll does with the green light — does it absorb it, or reflect it?");
      await tPage.waitForTimeout(300);
    }
    await shot(tPage, "13-drill-intervention", { fullPage: false });
    // Close panel
    await tPage.click('button[aria-label="Close"]');
    await tPage.waitForTimeout(400);
  }

  // ============================================================
  // PART 3 — Pupil session against the test class we just created
  // ============================================================
  console.log("\n— Part 3: pupil surfaces —");
  if (!created.testJoinCode || !created.testClassId) {
    console.log("  no test class join code; skipping pupil capture");
  } else {
    const pCtx = await newCtx();
    const pPage = await pCtx.newPage();
    await pPage.goto(`${BASE}/join`);
    await pPage.waitForLoadState("networkidle");
    // Find the code field (mono font, normalised) — the placeholder
    // changes between "switch lesson" and "join your lesson" copy.
    await pPage.locator('input').nth(0).fill(created.testJoinCode);
    await pPage.locator('input').nth(1).fill("Sam");
    await pPage.click('button:has-text("Join lesson")');
    await pPage.waitForURL("**/session", { timeout: 20_000 });
    await pPage.waitForLoadState("networkidle");
    await pPage.waitForTimeout(2500);

    // Pupil first sees the lobby overlay — class hasn't been started.
    // We capture that BEFORE firing the start intervention.
    await shot(pPage, "13b-pupil-lobby", { fullPage: false });

    // Teacher starts the class so the chat unlocks.
    await adminRtdb.ref(`liveSessions/${created.testClassId}/status`).set({
      value: "active",
      ts: Date.now(),
      wrapUpNote: null,
    });
    await pPage.waitForTimeout(1200);
    await shot(pPage, "14-pupil-session-start");

    // Capture the pupil's anon UID so we can clean it up.
    // We can grab it from the persisted Firebase Auth user via a script in the page.
    created.testPupilUid = await pPage.evaluate(() => {
      try {
        // @ts-ignore
        return (window.localStorage.getItem("bw-pupil-class-code") || "") && (window?.firebase?.auth?.()?.currentUser?.uid ?? null);
      } catch {
        return null;
      }
    });

    // Send a real message and wait for the tutor's reply.
    const input = pPage.locator('input[placeholder*="Reply to the tutor"]');
    await input.fill("I think the leaf has a green colour because... hmm, maybe it lets the green light pass through?");
    await pPage.click('button:has-text("Send")');
    // Wait for the tutor reply — looks for a Tutor section label that we
    // didn't already have.
    await pPage.waitForFunction(
      () => document.querySelectorAll('.bw-tutor').length >= 2,
      null,
      { timeout: 30_000 }
    );
    await pPage.waitForTimeout(1500);
    await shot(pPage, "15-pupil-conversation", { fullPage: false });

    // Send another message to make the conversation a bit longer.
    await input.fill("So the chlorophyll absorbs the other colours? And green just bounces off it?");
    await pPage.click('button:has-text("Send")');
    await pPage.waitForFunction(
      () => document.querySelectorAll('.bw-tutor').length >= 3,
      null,
      { timeout: 30_000 }
    );
    await pPage.waitForTimeout(1200);
    await shot(pPage, "16-pupil-conversation-deep", { fullPage: false });

    // Briefly drop the class into "paused" and capture the overlay,
    // then back to "active" so the rest of the flow continues.
    await adminRtdb.ref(`liveSessions/${created.testClassId}/status`).set({
      value: "paused", ts: Date.now(), wrapUpNote: null,
    });
    await pPage.waitForTimeout(1600);
    await shot(pPage, "16a-pupil-paused", { fullPage: false });
    await adminRtdb.ref(`liveSessions/${created.testClassId}/status`).set({
      value: "active", ts: Date.now(), wrapUpNote: null,
    });
    await pPage.waitForTimeout(600);

    // Press scaffold buttons until the ceiling (3 by default) fires Reason.
    for (let i = 0; i < 3; i++) {
      const scaffoldBtns = ["I need a hint", "Say that differently", "Use simpler words"];
      const label = scaffoldBtns[i];
      const btn = pPage.locator(`button:has-text("${label}")`);
      if ((await btn.count()) > 0) {
        await btn.first().click();
        await pPage.waitForTimeout(3000);
      }
    }
    // Reason card should be visible now.
    await pPage.waitForSelector('.bw-reason-surface', { timeout: 30_000 });
    await pPage.waitForTimeout(800);
    await shot(pPage, "17-pupil-reason-card", { fullPage: false });

    // Submit a substantive paraphrase so we get the "accept" branch.
    const reasonArea = pPage.locator('.bw-reason-surface textarea');
    await reasonArea.fill("Chlorophyll is the green stuff in leaves that grabs the light energy. It mostly grabs red and blue light and sends green light back, so leaves look green to us. The plant uses the energy to make sugar.");
    await pPage.click('.bw-reason-surface button:has-text("Submit")');
    await pPage.waitForTimeout(8000); // evaluator + responder
    await shot(pPage, "18-pupil-after-reason", { fullPage: false });

    // Capture the wrap-up overlay before the lesson ends.
    await adminRtdb.ref(`liveSessions/${created.testClassId}/status`).set({
      value: "wrap_up",
      ts: Date.now(),
      wrapUpNote: "Five minutes left — round off what you have.",
    });
    await pPage.waitForTimeout(1500);
    await shot(pPage, "18b-pupil-wrap-up", { fullPage: false });

    // ====================================================
    // PART 4 — End the class; capture closing screen + appraisal
    // ====================================================
    console.log("\n— Part 4: end class + appraisal —");
    // Teacher ends the test class.
    await tPage.goto(`${BASE}/class/${created.testClassId}`);
    await tPage.waitForLoadState("networkidle");
    await tPage.waitForTimeout(800);
    // Set up a confirm-dialog handler so the End-class confirm() goes through.
    tPage.once("dialog", (d) => d.accept());
    await tPage.click('button:has-text("End class")');
    await tPage.waitForTimeout(1500);

    // Pupil should now see the closing screen on the next render. The
    // RTDB subscription fires immediately.
    await pPage.waitForSelector('text=/Wrapping up your lesson|What you showed today/', { timeout: 30_000 });
    await pPage.waitForTimeout(15_000); // wait for the AI close to land
    await shot(pPage, "19-pupil-closing", { fullPage: true });

    // Teacher generates appraisal.
    await tPage.waitForSelector('button:has-text("Generate appraisal")', { timeout: 10_000 });
    await tPage.click('button:has-text("Generate appraisal")');
    await tPage.waitForSelector('text=/AI appraisal of this plan/', { timeout: 60_000 });
    await tPage.waitForTimeout(1000);
    await shot(tPage, "20-appraisal", { fullPage: true });

    await pCtx.close();
  }

  // Classroom display
  {
    const ctx = await newCtx();
    const page = await ctx.newPage();
    await page.goto(`${BASE}/classroom`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(700);
    await shot(page, "21-classroom-display", { fullPage: true });
    await ctx.close();
  }

  await tCtx.close();
  await browser.close();
  console.log("\n✓ Screenshots complete. Cleaning up test class…");
} catch (err) {
  console.error("\n✗ FAILED:", err.message);
  await browser.close().catch(() => {});
  process.exitCode = 1;
} finally {
  // Clean up the test class we created for the wizard + pupil screenshots.
  // (The sim class TQG-7R5 is left alone.)
  try {
    if (created.testClassId) {
      const pupils = await adminDb
        .collection("pupils")
        .where("classId", "==", created.testClassId)
        .get();
      for (const p of pupils.docs) {
        await adminAuth.deleteUser(p.id).catch(() => {});
        await p.ref.delete().catch(() => {});
      }
      // Conversation docs
      const convos = await adminDb.collection("conversations").listDocuments();
      for (const c of convos) {
        if (c.id.startsWith(created.testClassId + "_")) {
          const msgs = await c.collection("messages").get();
          for (const m of msgs.docs) await m.ref.delete().catch(() => {});
          await c.delete().catch(() => {});
        }
      }
      // Snapshots, reason events, interventions
      for (const coll of ["engagementSnapshots", "reasonEvents", "safeguardingEvents", "interventions"]) {
        const q = coll === "engagementSnapshots"
          ? await adminDb.collection(coll).where("sessionId", "==", created.testClassId).get()
          : await adminDb.collection(coll).where("classId", "==", created.testClassId).get();
        for (const d of q.docs) await d.ref.delete().catch(() => {});
      }
      // RTDB
      await adminRtdb.ref(`liveSessions/${created.testClassId}`).remove().catch(() => {});
      // Class + joinCode
      await adminDb.collection("classes").doc(created.testClassId).delete().catch(() => {});
      if (created.testJoinCode) {
        await adminDb.collection("joinCodes").doc(created.testJoinCode).delete().catch(() => {});
      }
      console.log(`✓ cleaned up test class ${created.testClassId}.`);
    }
  } catch (e) {
    console.warn("cleanup warn:", e.message);
  }
  process.exit(process.exitCode ?? 0);
}
