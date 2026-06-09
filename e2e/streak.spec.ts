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

  await page.route("**/api/notifications**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ notifications: [], unreadCount: 0 }),
    })
  );

  await page.route("**/api/stream**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: "data: {}\n\n",
    })
  );

  // ── Streak data ──────────────────────────────────────────────────────────
  await page.route("**/api/metrics/streak**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        current: 12,
        longest: 21,
        lastCommitDate: "2026-05-18",
        totalActiveDays: 63,
      }),
    })
  );

  await page.route("**/api/streak/freeze**", (route) =>
    route.fulfill({
      contentType: "application/json",
      // Component reads {hasFreeze, freezeDate} — not {freezes:[]}.
      body: JSON.stringify({ hasFreeze: false, freezeDate: null }),
    })
  );

  // ── Goals ────────────────────────────────────────────────────────────────
  await page.route("**/api/goals/sync**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, last_synced_at: new Date().toISOString() }),
    })
  );

  await page.route("**/api/goals**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ goals: [] }),
    })
  );

  // Provide valid contribution data so StreakTracker doesn't hit the empty-state
  // early-return (which hides all widgets including the freeze button).
  await page.route("**/api/metrics/contributions**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        days: 10,
        total: 100,
        data: { "2026-05-18": 5 },
      }),
    })
  );

  // ── Stub remaining metrics ───────────────────────────────────────────────
  const stubs = [
    "**/api/metrics/prs**",
    "**/api/metrics/pr-breakdown**",
    "**/api/metrics/pr-review-trend**",
    "**/api/metrics/issues**",
    "**/api/metrics/languages**",
    "**/api/metrics/weekly-summary**",
    "**/api/ai-insights**",
    "**/api/metrics/repos**",
    "**/api/metrics/pinned-repos**",
    "**/api/metrics/compare**",
    "**/api/metrics/repo-health**",
    "**/api/metrics/ci**",
    "**/api/user/github-accounts**",
    "**/api/integrations/jira**",
    "**/api/metrics/activity**",
    "**/api/metrics/commit-time**",
    "**/api/metrics/personal-records**",
    "**/api/metrics/discussions**",
    "**/api/metrics/inactive-repos**",
    "**/api/local-coding/stats**",
    "**/api/metrics/coding-time**",
    "**/api/metrics/coding-activity-insights**",
    "**/api/wakatime**",
    "**/api/metrics/productive-hours**",
    "**/api/user/pinned-repos/details**",
    "**/api/metrics/repo-explorer**",
  ];
  for (const pattern of stubs) {
    await page.route(pattern, (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify({}) })
    );
  }
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

  // The mock returns current: 12. Target the specific stat card using its aria-label
  // so we don't collide with "Jun 12" / "Dec 12" tooltip text in the calendar heatmap.
  await expect(
    page
      .locator('[aria-label="Current consecutive coding days"]')
      .locator("..", { hasText: "" }) // climb to the card wrapper
      .getByText("12")
      .first()
  ).toBeVisible({ timeout: 10_000 });
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

  // Add explicit wait for button container
  await page.waitForSelector('[data-testid="streak-freeze-button"]', { timeout: 10_000 }).catch(() => null);

  // Freeze / Protect button should be visible in the streak section.
  const freezeBtn = page.locator('[data-testid="streak-freeze-button"]').first();
  await expect(freezeBtn).toBeVisible({ timeout: 15_000 });
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
        body: JSON.stringify({ hasFreeze: true, freezeDate: "2026-05-18" }),
      });
    }
    // GET — must match {hasFreeze, freezeDate} shape
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
