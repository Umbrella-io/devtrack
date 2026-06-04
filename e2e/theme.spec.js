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

test("theme toggle switches between dark and light mode", async ({ page }) => {
  await page.goto("/dashboard");

  // The DashboardHeader provides the ThemeToggle on the dashboard
  const themeToggle = page.getByRole("button", { name: "Toggle theme" }).first();
  await expect(themeToggle).toBeVisible();

  const initialPressed = await themeToggle.getAttribute("aria-pressed");

  await themeToggle.click({ force: true });

  await expect(themeToggle).toHaveAttribute(
    "aria-pressed",
    initialPressed === "true" ? "false" : "true"
  );
});

/**
 * Issue #964: Public profile page should have a theme toggle.
 * The toggle must work without login and persist to localStorage.
 * We navigate to the profile-not-found page because no real user exists
 * in the test DB — but the layout (ThemeProvider + ThemeToggle) still renders.
 */
test("public profile page theme toggle works without authentication", async ({
  page,
}) => {
  // Clear cookies so visitor is unauthenticated
  await page.context().clearCookies();

  // Navigate to any public profile URL — will show "Profile Not Found"
  // but the full layout (including ThemeToggle) still renders
  await page.goto("/u/no-such-user-for-e2e-test", { waitUntil: "load" });

  // Confirm we're on the public profile route (no auth redirect)
  await expect(page).toHaveURL(/\/u\//);

  // ThemeToggle must be present in the AppNavbar and functional without login
  const themeToggle = page.getByRole("banner").getByRole("button", { name: "Toggle theme" });
  await expect(themeToggle).toBeVisible({ timeout: 10000 });

  const initialPressed = await themeToggle.getAttribute("aria-pressed");

  await themeToggle.click();

  // Toggle state must have flipped
  await expect(themeToggle).toHaveAttribute(
    "aria-pressed",
    initialPressed === "true" ? "false" : "true"
  );

  // Theme preference must be persisted to localStorage
  const stored = await page.evaluate(() => localStorage.getItem("theme"));
  expect(stored === "dark" || stored === "light").toBe(true);
});
