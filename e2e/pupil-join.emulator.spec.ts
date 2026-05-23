import { test, expect } from "@playwright/test";
import { E2E } from "./global-setup";

// pupil-join scenario — the full real path against the emulator:
// anonymous sign-in (Auth emulator) → POST /api/classes/join (admin validates
// the seeded join code + writes the pupil doc to the Firestore emulator) →
// "You are in" confirmation. Proves the seam end-to-end with no live backend.
test("pupil joins a seeded class with a valid code", async ({ page }) => {
  await page.goto("/join");
  await page.getByPlaceholder("e.g. PHO-Y8B").fill(E2E.joinCode);
  await page.getByPlaceholder("First name").fill("Alex");
  await page.getByRole("button", { name: "Join lesson" }).click();

  await expect(page.getByText("You are in.")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(new RegExp(E2E.className))).toBeVisible();
});

test("an unknown code is rejected", async ({ page }) => {
  await page.goto("/join");
  await page.getByPlaceholder("e.g. PHO-Y8B").fill("ZZZZZZ");
  await page.getByPlaceholder("First name").fill("Sam");
  await page.getByRole("button", { name: "Join lesson" }).click();

  await expect(page.getByText(/unknown class code/i)).toBeVisible({ timeout: 20_000 });
});
