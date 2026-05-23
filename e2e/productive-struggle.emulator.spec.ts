import { test, expect } from "@playwright/test";
import { E2E } from "./global-setup";

// B1 — Reason resumption, end-to-end against the emulator (LLM in
// deterministic fallback mode). A pupil joins, exhausts the three scaffolds
// (the scaffold-ceiling trigger fires a Reason prompt), answers it, and the
// tutor MUST take a fresh coach turn so the lesson resumes rather than
// stalling. This is the e2e form of the B1 fix — it would fail before the
// resume change and passes after.
test("scaffold ceiling fires Reason, and answering it resumes with a fresh tutor turn", async ({
  page,
}) => {
  test.setTimeout(60_000);

  // Join the seeded, already-"active" class.
  await page.goto("/join");
  await page.getByPlaceholder("e.g. PHO-Y8B").fill(E2E.joinCode);
  await page.getByPlaceholder("First name").fill("Alex");
  await page.getByRole("button", { name: "Join lesson" }).click();

  // Land in the session with the chat unlocked.
  const reply = page.getByPlaceholder("Reply to the tutor…");
  await expect(reply).toBeVisible({ timeout: 20_000 });

  // Send one substantive message, then exhaust the three scaffolds — the
  // third press hits the ceiling and fires the Reason prompt.
  await reply.fill("I think plants use light somehow but I'm not sure how.");
  await page.getByRole("button", { name: /^Send$/ }).click();

  for (let i = 0; i < 3; i++) {
    const hint = page.getByRole("button", { name: "I need a hint" });
    await expect(hint).toBeEnabled({ timeout: 20_000 });
    await hint.click();
    // let the scaffold turn land before the next press
    await page.waitForTimeout(400);
  }

  // The Reason card appears (its own response field + Submit).
  const reasonField = page.getByLabel("Your response");
  await expect(reasonField).toBeVisible({ timeout: 20_000 });

  // Count tutor paragraphs while the Reason card is up. NOTE this count
  // INCLUDES the Reason prompt itself (it renders as p.bw-tutor too). When
  // the pupil answers, that prompt paragraph is removed and replaced by the
  // responder acknowledgement; the net count therefore only RISES above
  // `before` if the tutor ALSO takes a fresh coach turn (the B1 resume).
  // So `> before` is precisely the fails-before / passes-after assertion:
  // pre-fix the lesson stalls (responder only → net 0), post-fix it resumes.
  const tutorTurns = page.locator("p.bw-tutor");
  const before = await tutorTurns.count();

  await reasonField.fill("Plants take in light and use it to make their food.");
  await page.getByRole("button", { name: /^Submit$/ }).click();

  await expect(async () => {
    expect(await tutorTurns.count()).toBeGreaterThan(before);
  }).toPass({ timeout: 30_000 });
  await expect(reply).toBeEnabled();
});
