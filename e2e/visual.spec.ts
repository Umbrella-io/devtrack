import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

const authSecret =
  process.env.NEXTAUTH_SECRET ||
  "test-nextauth-secret-for-playwright-tests";

async function mockSession(page: any) {
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

  await page.route("**/api/auth/session", async (route: any) => {
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
  
  // Mock AI insights
  await page.route("**/api/ai-insights**", async (route: any) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          insights: [
            {
              id: "insight-1",
              type: "productivity",
              title: "High Consistency",
              description: "You have coded 5 days this week!",
              severity: "positive",
            },
          ],
          trend: { direction: "up", percentage: 15 },
          aiSummary: "Great job shipping features this week. Keep up the high standard!",
          generatedAt: "2026-05-18T12:00:00.000Z",
        },
      }),
    });
  });
  
  await page.route("**/api/goals**", async (route: any) => {
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
            last_synced_at: new Date().toISOString(),
          },
        ],
      }),
    });
  });

  await page.route("**/api/goals/sync**", async (route: any) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ updated: 1, commitCount: 4 }),
    });
  });
  
  await page.route("**/api/user/settings**", async (route: any) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ is_public: true }) });
  });
  
  await page.route("**/api/notifications**", async (route: any) => {
    await route.fulfill({ contentType: "application/json", body: JSON.stringify({ notifications: [], unreadCount: 0 }) });
  });

  await page.route("**/api/metrics/contributions**", async (route: any) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          "2026-05-16": 3,
          "2026-05-17": 5,
          "2026-05-18": 2,
        },
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
    "**/api/local-coding/stats**",
    "**/api/metrics/coding-time**",
    "**/api/metrics/coding-activity-insights**",
    "**/api/wakatime**",
  ];

  for (const pattern of metricRoutes) {
    await page.route(pattern, async (route: any) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(mockMetricResponse(route.request().url())),
      });
    });
  }

  await page.route("**/api/stream**", async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: "data: {}\n\n",
    });
  });

  await page.route(/github\.com\/.*\.png/, async (route: any) => {
    await route.fulfill({
      contentType: "image/png",
      body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"),
    });
  });
}

function mockMetricResponse(url: string) {
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
  if (url.includes("/api/local-coding/stats")) {
    return {
      dailyData: [],
      totals: { totalSeconds: 0, totalDays: 0, avgSecondsPerDay: 0 },
      hasData: false,
    };
  }
  if (url.includes("/api/metrics/coding-time") || url.includes("/api/wakatime")) {
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
  return {};
}

test.describe("Visual Regression Tests", () => {
  test("Landing page - dark mode", async ({ page }) => {
    test.setTimeout(60000);
    await page.route(/github\.com\/.*\.png/, async (route: any) => {
      await route.fulfill({
        contentType: "image/png",
        body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64"),
      });
    });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await expect(page).toHaveScreenshot("landing-page-dark.png", { fullPage: true, animations: "disabled", timeout: 25000 });
  });

  test("Sign-in page", async ({ page }) => {
    test.setTimeout(60000);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/auth/signin", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("signin-page.png", { fullPage: true, animations: "disabled", timeout: 25000 });
  });

  test("Dashboard header - dark mode", async ({ page }) => {
    test.setTimeout(60000);
    await mockSession(page);

    await page.emulateMedia({ colorScheme: "dark" });

    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(3000);

    const header = page.locator("header").first();

    await expect(header).toBeVisible({
      timeout: 25000,
    });

    await header.evaluate((el) => {
      el.classList.remove("transition-all");
    });

    await page.addStyleTag({
      content: `
        *,
        *::before,
        *::after {
          transition: none !important;
          animation: none !important;
          caret-color: transparent !important;
        }
      `,
    });

    await expect(header).toHaveScreenshot(
      "dashboard-header-dark.png",
      {
        animations: "disabled",
        timeout: 25000,
      }
    );
  });

  test("Dashboard header - light mode", async ({ page }) => {
    test.setTimeout(60000);
    await mockSession(page);

    await page.emulateMedia({ colorScheme: "light" });

    await page.goto("/dashboard", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(3000);

    const header = page.locator("header").first();

    await expect(header).toBeVisible({
      timeout: 25000,
    });

    await header.evaluate((el) => {
      el.classList.remove("transition-all");
    });

    await page.addStyleTag({
      content: `
        *,
        *::before,
        *::after {
          transition: none !important;
          animation: none !important;
          caret-color: transparent !important;
        }
      `,
    });

    await expect(header).toHaveScreenshot(
      "dashboard-header-light.png",
      {
        animations: "disabled",
        timeout: 25000,
      }
    );
  });

  test("Public profile - mock data", async ({ page }) => {
    test.setTimeout(60000);
    await page.route("**/api/user/settings**", async (route: any) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          is_public: true,
        }),
      });
    });

    await page.route("**/u/playwright-user**", async (route: any) => {
      await route.continue();
    });

    await page.emulateMedia({ colorScheme: "dark" });

    await page.goto("/u/playwright-user", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(3000);

    await page.addStyleTag({
      content: `
        *,
        *::before,
        *::after {
          transition: none !important;
          animation: none !important;
          caret-color: transparent !important;
        }
      `,
    });

    await page.waitForLoadState("networkidle").catch(() => {});

    await expect(page.locator("body")).toBeVisible();

    await expect(page).toHaveScreenshot(
      "public-profile.png",
      {
        fullPage: true,
        animations: "disabled",
        timeout: 25000,
      }
    );
  });

  test("404 page", async ({ page }) => {
    test.setTimeout(60000);
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/this-page-does-not-exist-1234", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await expect(page).toHaveScreenshot("404-page.png", { fullPage: true, animations: "disabled", timeout: 25000 });
  });
});
