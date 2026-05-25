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

  await page.route("**/api/user/settings", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ is_public: true }),
    });
  });

  await page.route("**/api/metrics/contributions**", async (route) => {
    const url = new URL(route.request().url());
    const days = Number(url.searchParams.get("days") ?? 30);
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          "2026-05-16": days >= 7 ? 3 : 1,
          "2026-05-17": 5,
          "2026-05-18": 2,
        },
      }),
    });
  });

  await page.route("**/api/goals", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        contentType: "application/json",
        status: 201,
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        goals: [
          {
            id: "goal-1",
            title: "Make 10 commits",
            target: 10,
            current: 4,
            unit: "commits",
            recurrence: "weekly",
            period_start: "2026-05-18",
          },
        ],
      }),
    });
  });

  const metricRoutes = [
    "**/api/metrics/prs**",
    "**/api/metrics/pr-breakdown**",
    "**/api/metrics/issues**",
    "**/api/metrics/repos**",
    "**/api/metrics/languages**",
    "**/api/metrics/streak**",
    "**/api/metrics/pinned-repos**",
    "**/api/metrics/weekly-summary**",
    "**/api/metrics/compare**",
    "**/api/metrics/repo-health**",
    "**/api/metrics/ci**",
    "**/api/streak/freeze**",
    "**/api/user/github-accounts**",
    "**/api/metrics/activity**",
    "**/api/metrics/commit-time**",
    "**/api/metrics/personal-records**",
    "**/api/metrics/discussions**",
    "**/api/metrics/pr-review-trend**",
    "**/api/metrics/inactive-repos**",
    "**/api/notifications**",
  ];

  for (const pattern of metricRoutes) {
    await page.route(pattern, async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(mockMetricResponse(route.request().url())),
      });
    });
  }

  // Mock goals/sync so GoalTracker doesn't hang waiting for Supabase
  await page.route("**/api/goals/sync**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      body: JSON.stringify({ ok: true }),
    });
  });
});

test("dashboard widgets render with mocked metrics", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible({ timeout: 30000 });
  await expect(page.getByRole("heading", { name: "Your Commits" })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("heading", { name: "PR Analytics" })).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("heading", { name: "Goals" })).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("Make 10 commits")).toBeVisible({ timeout: 10000 });
});

test("contribution graph range buttons request a new range", async ({ page }) => {
  const contributionRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/metrics/contributions")) {
      contributionRequests.push(request.url());
    }
  });

  await page.goto("/dashboard", { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible({ timeout: 30000 });
  await page.getByRole("button", { name: "Show 90-day range" }).click();

  await expect.poll(() => contributionRequests.some((url) => url.includes("days=90")), { timeout: 15000 }).toBe(true);
});

test("goal form posts a new goal", async ({ page }) => {
  const goalPosts = [];
  page.on("request", (request) => {
    if (request.url().endsWith("/api/goals") && request.method() === "POST") {
      goalPosts.push(request.postDataJSON());
    }
  });

  await page.goto("/dashboard", { waitUntil: "load" });
  await expect(page.getByRole("heading", { name: /dashboard/i })).toBeVisible({ timeout: 30000 });
  await page.getByLabel("Goal title").fill("Ship one PR");
  await page.getByLabel("Target").fill("1");
  await page.getByLabel("Unit").selectOption("prs");
  await page.getByRole("button", { name: "Add goal" }).click();

  await expect.poll(() => goalPosts, { timeout: 15000 }).toHaveLength(1);
  expect(goalPosts[0]).toMatchObject({
    title: "Ship one PR",
    target: 1,
    unit: "prs",
  });
});

function mockMetricResponse(url) {
  if (url.includes("/api/metrics/prs")) {
    return {
      open: 2,
      merged: 8,
      closed: 1,
      avgReviewHours: 6,
      avgFirstReviewHours: 3,
      mergeRate: "80%",
    };
  }
  if (url.includes("/api/metrics/pr-breakdown")) {
    return { draft: 1, merged: 8, open: 2, closed: 1 };
  }
  if (url.includes("/api/metrics/issues")) {
    return {
      opened: 4,
      closed: 3,
      currentlyOpen: 1,
      avgCloseTimeDays: 2,
      trend: 1,
      mostActiveRepo: "demo/repo",
    };
  }
  if (url.includes("/api/metrics/repos") || url.includes("/api/metrics/pinned-repos")) {
    return { repos: [{ name: "demo/repo", commits: 12, url: "https://github.com/demo/repo" }] };
  }
  if (url.includes("/api/metrics/languages")) {
    return { languages: [{ language: "TypeScript", count: 12 }] };
  }
  if (url.includes("/api/metrics/streak")) {
    return { current: 3, longest: 9, lastCommitDate: "2026-05-18", totalActiveDays: 12 };
  }
  if (url.includes("/api/metrics/weekly-summary")) {
    return {
      commits: { current: 10, previous: 7, delta: 3, trend: "up" },
      prs: {
        thisWeek: { opened: 3, merged: 2 },
        lastWeek: { opened: 1, merged: 1 }
      },
      activeDays: {
        thisWeek: 5,
        lastWeek: 4
      },
      streak: 3,
      topRepo: "demo/repo",
    };
  }
  if (url.includes("/api/metrics/compare")) {
    return { user: { commits: 10 }, friend: { commits: 8 } };
  }
  if (url.includes("/api/metrics/repo-health")) {
    return { repositories: [] };
  }
  if (url.includes("/api/metrics/ci")) {
    return { successRate: 95, averageDurationMinutes: 3, flakiestWorkflow: null, totalRuns: 42, reposChecked: 5 };
  }
  if (url.includes("/api/streak/freeze")) {
    return { freezes: [] };
  }
  if (url.includes("/api/user/github-accounts")) {
    return { accounts: [] };
  }
  return {};
}
