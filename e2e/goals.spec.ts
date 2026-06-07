import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

/**
 * goals.spec.ts
 * Covers: create goal → appears in list; delete goal → removed from list.
 */

const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ?? "test-nextauth-secret-for-playwright-tests";

/** Minimal shared mock setup — only the routes goals tests need. */
async function setupGoalsMocks(page: import("@playwright/test").Page) {
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

  await page.route("**/api/goals/sync**", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ok: true, last_synced_at: new Date().toISOString() }),
    })
  );

  // Stub remaining metric routes so the page loads without errors.
  const stubs = [
    "**/api/metrics/contributions**",
    "**/api/metrics/streak**",
    "**/api/streak/freeze**",
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

test("[Goals E2E] goals widget renders on dashboard", async ({ page }) => {
  await setupGoalsMocks(page);

  await page.route("**/api/goals**", (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ goals: [] }),
    });
  });

  await page.goto("/dashboard", { waitUntil: "load" });
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true })
  ).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("heading", { name: "Goals", exact: true })
  ).toBeVisible({ timeout: 10_000 });
});

test("[Goals E2E] creating a goal sends POST /api/goals with correct payload", async ({
  page,
}) => {
  await setupGoalsMocks(page);

  const goalPosts: unknown[] = [];

  await page.route("**/api/goals**", async (route) => {
    if (route.request().method() === "POST") {
      goalPosts.push(route.request().postDataJSON());
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ goals: [] }),
    });
  });

  await page.goto("/dashboard", { waitUntil: "load" });
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true })
  ).toBeVisible({ timeout: 30_000 });

  await page.getByLabel("Goal title").fill("Ship one PR");
  await page.getByLabel("Target").fill("1");
  await page.getByLabel("Unit").selectOption("prs");
  await page.getByRole("button", { name: "Create goal" }).click();

  await expect.poll(() => goalPosts, { timeout: 10_000 }).toHaveLength(1);
  expect(goalPosts[0]).toMatchObject({ title: "Ship one PR", target: 1, unit: "prs" });
});

test("[Goals E2E] newly created goal appears in the goals list", async ({
  page,
}) => {
  await setupGoalsMocks(page);

  let goalsStore = [
    {
      id: "g-existing",
      title: "Existing Goal",
      target: 5,
      current: 2,
      unit: "commits",
      recurrence: "weekly",
      period_start: "2026-05-18",
      last_synced_at: new Date().toISOString(),
    },
  ];

  await page.route("**/api/goals**", async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      goalsStore.push({
        id: `g-new-${Date.now()}`,
        title: body.title as string,
        target: Number(body.target),
        current: 0,
        unit: body.unit as string,
        recurrence: (body.recurrence as string) ?? "none",
        period_start: "2026-05-18",
        last_synced_at: new Date().toISOString(),
      });
      return route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ goals: goalsStore }),
    });
  });

  await page.goto("/dashboard", { waitUntil: "load" });
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true })
  ).toBeVisible({ timeout: 30_000 });

  // Existing goal should be present.
  await expect(page.getByText("Existing Goal")).toBeVisible({ timeout: 10_000 });

  // Create a new goal.
  await page.getByLabel("Goal title").fill("Ship five PRs");
  await page.getByLabel("Target").fill("5");
  await page.getByLabel("Unit").selectOption("prs");
  await page.getByRole("button", { name: "Create goal" }).click();

  // The new goal should appear without a page reload.
  await expect(page.getByText("Ship five PRs")).toBeVisible({ timeout: 10_000 });
});

test("[Goals E2E] deleting a goal removes it from the list", async ({
  page,
}) => {
  await setupGoalsMocks(page);

  let goalsStore = [
    {
      id: "g-deleteme",
      title: "Goal to Delete",
      target: 3,
      current: 1,
      unit: "commits",
      recurrence: "weekly",
      period_start: "2026-05-18",
      last_synced_at: new Date().toISOString(),
    },
  ];

  await page.route("**/api/goals**", async (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ goals: goalsStore }),
    });
  });

  // DELETE /api/goals/:id
  await page.route("**/api/goals/**", async (route) => {
    if (route.request().method() === "DELETE") {
      const url = route.request().url();
      const id = url.split("/api/goals/")[1]?.split("?")[0];
      goalsStore = goalsStore.filter((g) => g.id !== id);
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
    return route.continue();
  });

  await page.goto("/dashboard", { waitUntil: "load" });
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true })
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Goal to Delete")).toBeVisible({ timeout: 10_000 });

  // Click the delete button next to this goal.
  const goalRow = page.locator("li, [data-testid='goal-item']").filter({
    hasText: "Goal to Delete",
  });
  await goalRow.getByRole("button", { name: /delete|remove/i }).click();

  // Goal should be gone.
  await expect(page.getByText("Goal to Delete")).not.toBeVisible({ timeout: 10_000 });
});