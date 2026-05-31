import { expect, test } from "@playwright/test";

test("[Landing E2E] page renders GitHub sign-in entrypoint", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in with GitHub" }).first(),
  ).toHaveAttribute("href", /\/api\/auth\/signin\/github\?callbackUrl=\/dashboard/);
  await expect(
    page.getByRole("link", { name: /star on github/i }).first(),
  ).toHaveAttribute("href", "https://github.com/Priyanshu-byte-coder/devtrack");
});

test("[Landing E2E] dashboard stays protected for unauthenticated users", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Sign in with GitHub" }).first()).toBeVisible();
});

test("[Landing E2E] landing has dashboard link", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
});

test("[Landing E2E] landing shows footer via test-id", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-testid="landing-footer"]')).toBeVisible();
});
