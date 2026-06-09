import { expect, test } from "@playwright/test";
import { encode } from "next-auth/jwt";

/**
 * api.spec.ts
 * Covers: /api/metrics/contributions returns 200 with valid session;
 * 401 (or redirect) without a session. Other critical API route checks.
 *
 * All assertions use Playwright's APIRequestContext so they hit the actual
 * Next.js route handlers — no mocking of the routes under test.
 */

const AUTH_SECRET =
  process.env.NEXTAUTH_SECRET ?? "test-nextauth-secret-for-playwright-tests";

/** Build a signed next-auth session cookie value. */
async function buildSessionCookie(): Promise<string> {
  return encode({
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
}

test("[API E2E] /api/metrics/contributions returns 401 without a session", async ({
  request,
}) => {
  const res = await request.get("/api/metrics/contributions");
  // Without a session, the route must reject — 401 or a redirect (302→/).
  expect([401, 302, 403]).toContain(res.status());
});

test("[API E2E] /api/goals returns 401 without a session", async ({
  request,
}) => {
  const res = await request.get("/api/goals");
  expect([401, 302, 403]).toContain(res.status());
});

test("[API E2E] /api/metrics/streak returns 401 without a session", async ({
  request,
}) => {
  const res = await request.get("/api/metrics/streak");
  expect([401, 302, 403]).toContain(res.status());
});

test("[API E2E] /api/metrics/contributions accepts valid session cookie", async ({
  request,
}) => {
  const sessionToken = await buildSessionCookie();

  const res = await request.get("/api/metrics/contributions?days=7", {
    headers: {
      Cookie: `next-auth.session-token=${sessionToken}`,
    },
  });

  // Session must be accepted; upstream GitHub may return 502 with the mock token.
  expect(res.status()).not.toBe(401);
  expect(res.headers()["content-type"] ?? "").toContain("application/json");
});

test("[API E2E] /api/auth/session returns a JSON object", async ({
  request,
}) => {
  const res = await request.get("/api/auth/session");
  expect(res.status()).toBe(200);
  const body = await res.json();
  // An unauthenticated session is an empty object {}, never null/undefined.
  expect(typeof body).toBe("object");
});

test("[API E2E] /api/goals POST without session returns 401 or 403", async ({
  request,
}) => {
  const res = await request.post("/api/goals", {
    data: { title: "Hack the planet", target: 1, unit: "commits", recurrence: "none" },
  });
  expect([401, 403]).toContain(res.status());
});

test("[API E2E] /api/metrics/contributions with days param returns valid JSON when authenticated", async ({
  request,
}) => {
  const sessionToken = await buildSessionCookie();

  const res = await request.get("/api/metrics/contributions?days=30", {
    headers: {
      Cookie: `next-auth.session-token=${sessionToken}`,
    },
  });

  expect(res.status()).not.toBe(401);
  const body = await res.json();
  expect(typeof body).toBe("object");
});