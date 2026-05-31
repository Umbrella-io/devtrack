import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

test.beforeEach(async ({ page }) => {
  const authSecret =
    process.env.NEXTAUTH_SECRET ||
    "test-nextauth-secret-for-playwright-tests";

  const token = await encode({
    secret: authSecret,
    token: {
      name: "Playwright User",
      email: "playwright@example.com",
      githubLogin: "playwright-user",
      githubId: "12345",
      accessToken: "test-token",
      expires: "2099-01-01T00:00:00.000Z",
    },
  });

  await page.context().addCookies([
    {
      name: "next-auth.session-token",
      value: String(token ?? ""),
      domain: "127.0.0.1",
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
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

  const themeToggle = page.getByRole("button", { name: "Toggle theme" });
  await expect(themeToggle).toBeVisible();

  const initialPressed = await themeToggle.getAttribute("aria-pressed");

  await themeToggle.click();

  await expect(themeToggle).toHaveAttribute(
    "aria-pressed",
    initialPressed === "true" ? "false" : "true"
  );
});
