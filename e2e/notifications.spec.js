import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

const authSecret = "playwright-placeholder-secret-that-is-long-enough";

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

  await page.route("**/api/auth/session", async (route) => {
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
});

test("notification bell opens and closes drawer", async ({ page }) => {
  await page.route("**/api/notifications**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        notifications: [
          {
            id: "1",
            type: "info",
            message: "Test notification",
            read: false,
            created_at: new Date().toISOString(),
          }
        ],
        unreadCount: 1,
      }),
    });
  });

  // Mock dashboard metrics to prevent errors
  await page.route("**/api/metrics/**", async (route) => {
    await route.fulfill({ json: {} });
  });
  await page.route("**/api/goals**", async (route) => {
    await route.fulfill({ json: { goals: [] } });
  });

  await page.goto("/dashboard");
  
  const bellButton = page.getByRole("button", { name: /Notifications/ });
  await expect(bellButton).toBeVisible();
  
  await bellButton.click();
  const drawerHeading = page.getByRole("heading", { name: "Notifications" });
  await expect(drawerHeading).toBeVisible();
  await expect(page.getByText("Test notification")).toBeVisible();
  
  await bellButton.click();
  await expect(drawerHeading).not.toBeVisible();
});
