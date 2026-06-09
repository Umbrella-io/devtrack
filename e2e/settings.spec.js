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
    cookieName: "next-auth.session-token",
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
    if (route.request().method() === "PATCH") {
      const data = JSON.parse(route.request().postData() || "{}");
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          id: "1",
          github_login: "playwright-user",
          is_public: data.is_public ?? false,
          leaderboard_opt_in: data.leaderboard_opt_in ?? false,
          has_wakatime_key: false,
        }),
      });
      return;
    }
    
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "1",
        github_login: "playwright-user",
        is_public: false,
        leaderboard_opt_in: false,
        has_wakatime_key: false,
      }),
    });
  });

  await page.route("**/api/user/github-accounts", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ accounts: [] }),
    });
  });
});

test("settings page saves and reflects changes", async ({ page }) => {
  await page.goto("/dashboard/settings");

  // Wait for settings to load
  await expect(page.getByRole("heading", { name: "Settings", exact: true })).toBeVisible();
  
  const publicProfileCheckbox = page.getByRole("checkbox", {
    name: "Toggle Public Profile",
  });

  await expect(publicProfileCheckbox).not.toBeChecked();
  await publicProfileCheckbox.check({ force: true });
  await expect(publicProfileCheckbox).toBeChecked();
});
