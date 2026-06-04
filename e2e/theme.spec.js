import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

const authSecret =
  process.env.NEXTAUTH_SECRET ||
  "test-nextauth-secret-for-playwright-tests";

test.beforeEach(async ({ page }) => {
  const sessionToken = await encode({
    secret: authSecret,
    token: {
      name: "Playwright User",
      email: "playwright@example.com",
      sub: "12345",
      githubLogin: "playwright-user",
      githubId: "12345",
      accessToken: "test-token",
    },
    maxAge: 60 * 60,
  });

  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: sessionToken,
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
      expires: Math.floor(Date.now() / 1000) + 60 * 60,
    },
  ]);

  await page.route("**/api/auth/session**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { name: "Playwright User", email: "playwright@example.com" },
        githubLogin: "playwright-user",
        githubId: "12345",
        accessToken: "test-token",
        expires: "2099-01-01T00:00:00.000Z",
      }),
    });
  });

  await page.route("**/api/user/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ is_public: true }),
    });
  });
});

test("theme selector switches between themes on the dashboard", async ({ page }) => {
  await page.goto("/dashboard");

  // The DashboardHeader provides the ThemeToggle select on the dashboard
  const themeSelect = page
    .getByRole("combobox", { name: "Select dashboard theme" })
    .first();
  await expect(themeSelect).toBeVisible({ timeout: 10000 });

  const initialValue = await themeSelect.inputValue();

  // Pick a different theme from the available options
  const nextTheme = initialValue === "classic-dark" ? "modern-light-blue" : "classic-dark";
  await themeSelect.selectOption(nextTheme);

  // Verify the select value updated
  await expect(themeSelect).toHaveValue(nextTheme);

  // Verify the theme is persisted to localStorage
  const stored = await page.evaluate(() => localStorage.getItem("theme"));
  expect(stored).toBe(nextTheme);
});

/**
 * Issue #964: Public profile page should have a theme toggle.
 * The toggle must work without login and persist to localStorage.
 * We navigate to the profile-not-found page because no real user exists
 * in the test DB — but the layout (ThemeProvider + ThemeToggle) still renders.
 */
test("public profile page theme selector works without authentication", async ({
  page,
}) => {
  // Clear cookies so visitor is unauthenticated
  await page.context().clearCookies();

  // Navigate to any public profile URL — will show "Profile Not Found"
  // but the full layout (including ThemeToggle) still renders
  await page.goto("/u/no-such-user-for-e2e-test", { waitUntil: "load" });

  // Confirm we're on the public profile route (no auth redirect)
  await expect(page).toHaveURL(/\/u\//);

  // ThemeToggle select must be present in the AppNavbar and functional without login
  const themeSelect = page
    .getByRole("banner")
    .getByRole("combobox", { name: "Select dashboard theme" });
  await expect(themeSelect).toBeVisible({ timeout: 10000 });

  const initialValue = await themeSelect.inputValue();

  // Switch to a different theme
  const nextTheme = initialValue === "classic-dark" ? "modern-light-blue" : "classic-dark";
  await themeSelect.selectOption(nextTheme);

  // Value must have changed
  await expect(themeSelect).toHaveValue(nextTheme);

  // Theme preference must be persisted to localStorage
  const stored = await page.evaluate(() => localStorage.getItem("theme"));
  expect(stored === "dark" || stored === "light" || stored === nextTheme).toBe(true);
});
