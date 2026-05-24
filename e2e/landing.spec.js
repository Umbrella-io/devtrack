import { expect, test } from "@playwright/test";

test("landing page renders GitHub sign-in entrypoint", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "DevTrack", exact: true })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sign in with GitHub" }),
  ).toHaveAttribute("href", /\/api\/auth\/signin\/github\?callbackUrl=\/dashboard/);
  await expect(page.getByRole("link", { name: "View on GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/Priyanshu-byte-coder/devtrack",
  );
});

test("dashboard stays protected for unauthenticated users", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Sign in with GitHub" })).toBeVisible();
});