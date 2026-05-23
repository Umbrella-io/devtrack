import { expect, test } from "@playwright/test";

test("public profile route renders without requiring authentication", async ({ page }) => {
  await page.goto("/u/playwright-user");

  await expect(page).toHaveURL(/\/u\/playwright-user$/);
  await expect(
    page.getByRole("heading", {
      name: /(@playwright-user's Profile|Profile Not Found)/,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in with GitHub" })).toHaveCount(0);
});
