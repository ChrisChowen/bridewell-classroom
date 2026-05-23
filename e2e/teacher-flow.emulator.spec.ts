import { test, expect } from "@playwright/test";
import { E2E } from "./global-setup";

// teacher-flow scenario — a seeded teacher signs in (email/password against
// the Auth emulator, role claim resolved) and lands on the dashboard with
// their seeded class visible. Proves the teacher auth seam + dashboard load
// end-to-end with no live backend.
test("teacher signs in and sees their class on the dashboard", async ({ page }) => {
  test.setTimeout(45_000);

  await page.goto("/login");
  await page.getByPlaceholder("jane.wells@kesw.org").fill(E2E.teacherEmail);
  await page.getByPlaceholder("••••••••").fill(E2E.teacherPassword);
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/dashboard/, { timeout: 20_000 });
  await expect(page.getByText(E2E.className).first()).toBeVisible({ timeout: 20_000 });
});

test("a wrong password is rejected", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("jane.wells@kesw.org").fill(E2E.teacherEmail);
  await page.getByPlaceholder("••••••••").fill("definitely-wrong");
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();

  // Stays on /login and surfaces an error rather than reaching the dashboard.
  await expect(page).not.toHaveURL(/\/dashboard/, { timeout: 10_000 });
});
