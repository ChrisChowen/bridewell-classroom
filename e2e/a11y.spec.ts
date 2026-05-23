import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Accessibility gate (P0). Runs axe-core over the auth-free public pages in
// both the default (light) and dark themes, and fails on any serious/critical
// violation. These are the surfaces a pupil/teacher hits before sign-in; the
// authed surfaces (session, dashboard) need the emulator seeded and are
// covered by the deferred full-flow specs (reports/blocked.md).

const PUBLIC_PAGES = [
  { name: "landing", path: "/" },
  { name: "login", path: "/login" },
  { name: "join", path: "/join" },
];

async function scan(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  return results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
}

for (const { name, path } of PUBLIC_PAGES) {
  test(`${name} has no serious/critical a11y violations (light)`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    const violations = await scan(page);
    expect(
      violations,
      violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`).join("\n"),
    ).toEqual([]);
  });

  test(`${name} has no serious/critical a11y violations (dark)`, async ({ page }) => {
    await page.goto(path, { waitUntil: "networkidle" });
    await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
    const violations = await scan(page);
    expect(
      violations,
      violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`).join("\n"),
    ).toEqual([]);
  });
}
