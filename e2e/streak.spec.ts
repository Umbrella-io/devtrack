import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";
import {
  installDashboardApiMocks,
  scrollToWidget,
  streakSection,
} from "./helpers/dashboard-mocks";

const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ?? "test-nextauth-secret-for-playwright-tests";

async function setupStreakMocks(page: import("@playwright/test").Page) {
  const sessionToken = await encode({
    secret: AUTH_SECRET,
    token: {
      name: "Playwright User",
      email: "playwright@devtrack.test",
      sub: "99001",
      githubLogin: "playwright-user",
      githubId: "99001",
      accessToken: "mock-access-token",
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

  await page.route("**/api/auth/session**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { name: "Playwright User", email: "playwright@devtrack.test" },
        githubLogin: "playwright-user",
        githubId: "99001",
        accessToken: "mock-access-token",
        expires: "2099-01-01T00:00:00.000Z",
      }),
    })
  );

  await page.route("**/api/user/settings**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ is_public: true }),
    })
  );

  await page.route("**/api/goals**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ goals: [] }),
    })
  );

  await installDashboardApiMocks(page);
}

test.beforeEach(async ({ page }) => {
  await setupStreakMocks(page);
});

test("[Streak E2E] streak widget section is rendered on dashboard", async ({
  page,
}) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true })
  ).toBeVisible({ timeout: 30_000 });

  await scrollToWidget(page, "Commit Streaks");
});

test("[Streak E2E] streak widget shows the mocked current streak value", async ({
  page,
}) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true })
  ).toBeVisible({ timeout: 30_000 });

  const section = streakSection(page);
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByText("Current Streak")).toBeVisible({
    timeout: 15_000,
  });
  await expect(section.getByText("12", { exact: true })).toBeVisible({
    timeout: 10_000,
  });
});

test("[Streak E2E] streak widget shows the mocked longest streak value", async ({
  page,
}) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true })
  ).toBeVisible({ timeout: 30_000 });

  const section = streakSection(page);
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByText("Longest Streak")).toBeVisible({
    timeout: 15_000,
  });
  await expect(section.getByText("21", { exact: true })).toBeVisible({
    timeout: 10_000,
  });
});

test("[Streak E2E] freeze button is present in the streak widget", async ({
  page,
}) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true })
  ).toBeVisible({ timeout: 30_000 });

  const freezeButton = streakSection(page).getByRole("button", {
    name: "Freeze Streak",
  });
  await freezeButton.scrollIntoViewIfNeeded();
  await expect(freezeButton).toBeVisible({ timeout: 15_000 });
});

test("[Streak E2E] streak freeze API is called when freeze button is clicked", async ({
  page,
}) => {
  const freezeRequests: string[] = [];

  await page.route("**/api/streak/freeze**", async (route) => {
    if (route.request().method() === "POST") {
      freezeRequests.push(route.request().url());
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          hasFreeze: true,
          freezeDate: "2026-05-18",
        }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ hasFreeze: false, freezeDate: null }),
    });
  });

  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true })
  ).toBeVisible({ timeout: 30_000 });

  const freezeButton = streakSection(page).getByRole("button", {
    name: "Freeze Streak",
  });
  await freezeButton.scrollIntoViewIfNeeded();
  await expect(freezeButton).toBeVisible({ timeout: 15_000 });
  await freezeButton.click();

  await expect
    .poll(() => freezeRequests.length, { timeout: 8_000 })
    .toBeGreaterThan(0);
});
