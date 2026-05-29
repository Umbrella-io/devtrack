import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

const authSecret = "playwright-placeholder-secret-that-is-long-enough";

test.beforeEach(async ({ page }) => {
  const sessionToken = await encode({
    secret: process.env.NEXTAUTH_SECRET ?? authSecret,
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

  await page.route("**/api/user/settings**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        id: "1",
        github_login: "playwright-user",
        is_public: true,
        leaderboard_opt_in: false,
        pinned_repos: [],
        has_wakatime_key: false,
        discord_webhook_url: null,
        timezone: "UTC",
      }),
    });
  });

  await page.route("**/api/user/pinned-repos/details**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ pinned: [] }),
    });
  });

  await page.route("**/api/wakatime**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({}),
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
    "**/api/integrations/jira**",
    "**/api/metrics/activity**",
    "**/api/metrics/commit-time**",
    "**/api/metrics/personal-records**",
    "**/api/metrics/discussions**",
    "**/api/metrics/pr-review-trend**",
    "**/api/metrics/inactive-repos**",
    "**/api/local-coding/stats**",
    "**/api/metrics/coding-time**",
    "**/api/metrics/coding-activity-insights**",
    "**/api/ai-insights**",
    "**/api/goals**",
    "**/api/stream**",
  ];

  for (const pattern of metricRoutes) {
    await page.route(pattern, async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(mockMetricResponse(route.request().url())),
      });
    });
  }

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
          lastWeek: { opened: 1, merged: 1 },
        },
        activeDays: {
          thisWeek: 5,
          lastWeek: 4,
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
    if (url.includes("/api/integrations/jira")) {
      return null;
    }
    if (url.includes("/api/user/github-accounts")) {
      return { accounts: [] };
    }
    if (url.includes("/api/local-coding/stats")) {
      return {
        dailyData: [],
        totals: { totalSeconds: 0, totalDays: 0, avgSecondsPerDay: 0 },
        hasData: false,
      };
    }
    if (url.includes("/api/metrics/coding-time")) {
      return {
        hasData: false,
        not_configured: true,
        todaysSeconds: 0,
        totalSeconds7Days: 0,
        chartData: [],
        topLanguage: "",
        topProject: "",
      };
    }
    if (url.includes("/api/metrics/coding-activity-insights")) {
      return {
        hourlyCounts: [],
        mostActiveHour: { hour: 0, count: 0, label: "" },
        leastActiveHour: { hour: 0, count: 0, label: "" },
        totalActivities: 0,
        averageDailyCommits: 0,
        consistencyScore: 0,
        productivityLevel: "Low",
        timezone: "UTC",
      };
    }
    if (url.includes("/api/goals")) {
      return { goals: [] };
    }
    if (url.includes("/api/ai-insights")) {
      return {
        data: {
          insights: [],
          trend: { direction: "up", percentage: 15 },
          aiSummary: "Mock summary",
          generatedAt: "2026-05-18T12:00:00.000Z",
        },
      };
    }
    return {};
  }

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
