import { expect, test } from "@playwright/test";

test("landing page renders GitHub sign-in entrypoint", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("DEVTRACK").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in with GitHub" }).first(),
  ).toHaveAttribute("href", /\/api\/auth\/signin\/github\?callbackUrl=\/dashboard/);
  await expect(page.getByRole("link", { name: /Star on GitHub/i }).first()).toHaveAttribute(
    "href",
    "https://github.com/Priyanshu-byte-coder/devtrack",
  );
});

test("dashboard stays protected for unauthenticated users", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Sign in with GitHub" }).first()).toBeVisible();
});
