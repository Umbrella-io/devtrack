import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

const authSecret =
  process.env.NEXTAUTH_SECRET ??
  "playwright-placeholder-secret-that-is-long-enough";

test.beforeEach(async ({ page }) => {
  const token = await encode({
    secret: authSecret,
    token: {
      name: "Playwright User",
      email: "playwright@example.com",
      githubLogin: "playwright-user",
      githubId: "12345",
      accessToken: "test-token",
      accessTokenValidatedAt: Date.now(),
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

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          name: "Playwright User",
          email: "playwright@example.com",
        },
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
          },
        ],
        unreadCount: 1,
      }),
    });
  });

  await page.route("**/api/metrics/**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({}),
    });
  });

  await page.route("**/api/goals**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ goals: [] }),
    });
  });

  await page.goto("/dashboard", {
    waitUntil: "networkidle",
  });

  console.log(
    await page.locator("button").evaluateAll((els) =>
      els.map((e) => ({
        text: e.textContent,
        aria: e.getAttribute("aria-label"),
        title: e.getAttribute("title"),
      }))
    )
  );


  await page.waitForTimeout(2000);

  const bellButton = page
    .locator(
      'button[aria-label*="notification" i], button:has([data-lucide="bell"])'
    )
    .first();

  await expect(bellButton).toBeVisible({
    timeout: 15000,
  });

  await bellButton.click();

  const drawerHeading = page.getByRole("heading", {
    name: /Notifications/i,
  });

  await expect(drawerHeading).toBeVisible({
    timeout: 10000,
  });

  await expect(
    page.getByText("Test notification")
  ).toBeVisible();

  await bellButton.click();

  await expect(drawerHeading).not.toBeVisible();
});
