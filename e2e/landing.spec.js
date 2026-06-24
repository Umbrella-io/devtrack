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
  await expect(page.getByRole("link", { name: "Dashboard", exact: true }).first()).toBeVisible();
});

test("[Landing E2E] landing introduces DevTrack in an about section", async ({ page }) => {
  await page.goto("/");
  const about = page.locator("#about");
  await about.scrollIntoViewIfNeeded();
  await expect(about.getByRole("heading", { name: /developer progress/i })).toBeVisible();
  await expect(about.getByText("Live GitHub Signals")).toBeVisible();
  await expect(about.getByRole("link", { name: "Explore features" })).toHaveAttribute("href", "#features");
});

test("[Landing E2E] landing shows footer", async ({ page }) => {
  await page.goto("/");
  // Check that the global footer is rendered (e.g. looking for the copyright text)
  await expect(page.getByText(/DevTrack. Built for open-source contributors/i)).toBeVisible();
});

test("[Landing E2E] landing shows the product feature showcase", async ({ page }) => {
  await page.goto("/");

  const features = page.locator("#features");
  await features.scrollIntoViewIfNeeded();

  await expect(features.getByRole("heading", { name: /everything contributors need/i })).toBeVisible();
  await expect(features.getByText("Commit streaks tracker")).toBeVisible();
  await expect(features.getByText("PR analytics")).toBeVisible();
  await expect(features.getByText("Weekly goals")).toBeVisible();
  await expect(features.getByText("Shareable profile")).toBeVisible();
  await expect(features.getByText("Repository insights")).toBeVisible();
  await expect(features.getByText("AI weekly insights")).toBeVisible();
});

test("[Landing E2E] landing explains the how it works flow", async ({ page }) => {
  await page.goto("/");

  const howItWorks = page.locator("#how-it-works");
  await howItWorks.scrollIntoViewIfNeeded();

  await expect(
    howItWorks.getByRole("heading", { name: /connect github\. view metrics\. set goals\./i }),
  ).toBeVisible();

  await expect(howItWorks.getByRole("heading", { name: "Connect GitHub", exact: true })).toBeVisible();
  await expect(howItWorks.getByRole("heading", { name: "View metrics", exact: true })).toBeVisible();
  await expect(howItWorks.getByRole("heading", { name: "Set goals", exact: true })).toBeVisible();
});

test("[Landing E2E] landing has final GitHub sign-in CTA", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /build a clearer story/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in with GitHub" }).last()).toHaveAttribute(
    "href",
    /\/api\/auth\/signin\/github\?callbackUrl=\/dashboard/,
  );
});

test("[Landing E2E] landing has no horizontal overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(horizontalOverflow).toBeLessThanOrEqual(1);
});