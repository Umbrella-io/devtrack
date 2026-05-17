import { expect, type Page, test } from "@playwright/test";

type Goal = {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  recurrence: "none" | "weekly" | "monthly";
  period_start: string;
};

const jsonHeaders = {
  "content-type": "application/json",
};

function contributionPayload(days: number) {
  const now = new Date("2026-05-17T00:00:00.000Z");
  const data: Record<string, number> = {};

  for (let index = 0; index < Math.min(days, 5); index += 1) {
    const day = new Date(now);
    day.setUTCDate(now.getUTCDate() - index);
    data[day.toISOString().slice(0, 10)] = index + 1;
  }

  return {
    days,
    total: Object.values(data).reduce((sum, commits) => sum + commits, 0),
    data,
  };
}

async function mockDashboardApis(page: Page) {
  const goals: Goal[] = [];
  const contributionRequests: number[] = [];

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === "/api/auth/session") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          user: { name: "Saurabh Kumar Bajpai" },
          githubId: "12345",
          githubLogin: "saurabhhhcodes",
          expires: "2099-01-01T00:00:00.000Z",
        }),
      });
      return;
    }

    if (path === "/api/user/settings") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ is_public: true }),
      });
      return;
    }

    if (path === "/api/user/github-accounts") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ accounts: [] }),
      });
      return;
    }

    if (path === "/api/goals" && request.method() === "GET") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ goals }),
      });
      return;
    }

    if (path === "/api/goals" && request.method() === "POST") {
      const body = request.postDataJSON() as {
        title: string;
        target: number;
        unit: string;
        recurrence: Goal["recurrence"];
      };
      const goal: Goal = {
        id: `goal-${goals.length + 1}`,
        title: body.title,
        target: body.target,
        current: 0,
        unit: body.unit,
        recurrence: body.recurrence,
        period_start: "1970-01-01T00:00:00.000Z",
      };
      goals.unshift(goal);
      await route.fulfill({
        status: 201,
        headers: jsonHeaders,
        body: JSON.stringify({ goal }),
      });
      return;
    }

    if (path.startsWith("/api/goals/") && request.method() === "DELETE") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ ok: true }),
      });
      return;
    }

    if (path === "/api/metrics/contributions") {
      const days = Number(url.searchParams.get("days") ?? "30");
      contributionRequests.push(days);
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify(contributionPayload(days)),
      });
      return;
    }

    if (path === "/api/metrics/streak") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          current: 4,
          longest: 12,
          lastCommitDate: "2026-05-17",
          totalActiveDays: 18,
        }),
      });
      return;
    }

    if (path === "/api/streak/freeze") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ hasFreeze: false }),
      });
      return;
    }

    if (path === "/api/metrics/prs") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          open: 3,
          merged: 8,
          avgReviewHours: 6,
          mergeRate: "73%",
        }),
      });
      return;
    }

    if (path === "/api/metrics/issues") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          opened: 5,
          closed: 4,
          currentlyOpen: 2,
          avgCloseTimeDays: 1.7,
          trend: 2,
        }),
      });
      return;
    }

    if (path === "/api/metrics/repos") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          repos: [
            {
              name: "saurabhhhcodes/devtrack",
              commits: 14,
              url: "https://github.com/saurabhhhcodes/devtrack",
            },
          ],
        }),
      });
      return;
    }

    if (path === "/api/metrics/repo-health") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          repos: [
            {
              repo: "saurabhhhcodes/devtrack",
              score: 92,
              grade: "green",
              signals: {
                commitFrequency: 14,
                prMergeRate: 0.9,
                avgPrOpenTimeHours: 4,
                openIssuesCount: 2,
                daysSinceLastCommit: 0,
              },
            },
          ],
        }),
      });
      return;
    }

    if (path === "/api/metrics/pinned-repos") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          pinnedRepos: [
            {
              name: "devtrack",
              description: "Developer productivity dashboard",
              url: "https://github.com/Priyanshu-byte-coder/devtrack",
              stargazerCount: 29,
              forkCount: 8,
              primaryLanguage: { name: "TypeScript", color: "#3178c6" },
            },
          ],
        }),
      });
      return;
    }

    if (path === "/api/metrics/languages") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          languages: [
            { name: "TypeScript", bytes: 7000, percentage: 70 },
            { name: "JavaScript", bytes: 3000, percentage: 30 },
          ],
        }),
      });
      return;
    }

    if (path === "/api/metrics/pr-breakdown") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ draft: 1, open: 3, merged: 8, closed: 2 }),
      });
      return;
    }

    if (path === "/api/metrics/weekly-summary") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          commits: { current: 18, last: 11, delta: 7 },
          pullRequests: { opened: 4, merged: 3 },
          activeDays: 5,
          streak: 4,
          mostActiveRepo: "saurabhhhcodes/devtrack",
          weekStart: "2026-05-11T00:00:00.000Z",
          generatedAt: "2026-05-17T00:00:00.000Z",
        }),
      });
      return;
    }

    if (path === "/api/metrics/compare") {
      await route.fulfill({
        status: 200,
        headers: jsonHeaders,
        body: JSON.stringify({
          username: "me",
          commits: 18,
          prs: 4,
          issues: 5,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify({}),
    });
  });

  return { contributionRequests };
}

test("landing page exposes the GitHub sign-in flow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "DevTrack" })).toBeVisible();
  const signInLink = page.getByRole("link", { name: "Sign in with GitHub" });
  await expect(signInLink).toHaveAttribute(
    "href",
    "/api/auth/signin/github?callbackUrl=/dashboard"
  );
  await expect(page.getByRole("link", { name: "View on GitHub" })).toHaveAttribute(
    "href",
    "https://github.com/Priyanshu-byte-coder/devtrack"
  );
});

test("dashboard renders core widgets with mocked authenticated data", async ({
  page,
}) => {
  await mockDashboardApis(page);

  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "This Week" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Commit Activity" })).toBeVisible();
  await expect(page.getByText("Open PRs")).toBeVisible();
  await expect(page.getByText("Merged (30d)")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Issue Analytics" })).toBeVisible();
  await expect(page.getByText("saurabhhhcodes/devtrack").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Language Breakdown" })).toBeVisible();
});

test("dashboard supports contribution range switching and goal creation", async ({
  page,
}) => {
  const { contributionRequests } = await mockDashboardApis(page);

  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Commit Activity" })).toBeVisible();

  await page.getByRole("button", { name: "Show 7-day range" }).click();
  await expect
    .poll(() => contributionRequests.includes(7))
    .toBe(true);

  await expect(page.getByText("No goals yet. Create one below.")).toBeVisible();
  await page.getByLabel("Goal title").fill("Ship e2e tests");
  await page.getByLabel("Target").fill("3");
  await page.getByLabel("Unit").fill("pull requests");
  await page.getByRole("button", { name: "Weekly" }).click();
  await page.getByRole("button", { name: "Add goal" }).click();

  await expect(page.getByText("Ship e2e tests")).toBeVisible();
  await expect(page.getByText("0/3 pull requests")).toBeVisible();
  await expect(page.getByText("Weekly").first()).toBeVisible();
});
