import { expect, test } from "@playwright/test";

test("landing page renders GitHub sign-in entrypoint", async ({ page }) => {
  await page.goto("/");

  // The hero h1 is "YOUR CODE HAS A PULSE" — verify the page loaded
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // Two "Sign in with GitHub" links exist (hero + setup section) — check first one
  await expect(
    page.getByRole("link", { name: "Sign in with GitHub" }).first(),
  ).toHaveAttribute("href", /\/api\/auth\/signin\/github\?callbackUrl=\/dashboard/);

  // Verify at least one link to the upstream GitHub repo is present
  await expect(
    page.getByRole("link", { name: /star on github/i }).first(),
  ).toHaveAttribute("href", "https://github.com/Priyanshu-byte-coder/devtrack");
});

test("dashboard stays protected for unauthenticated users", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Sign in with GitHub" }).first()).toBeVisible();
});

test("landing page shows dashboard link", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
});

test("landing shows footer", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("contentinfo").first()).toBeVisible();
});

