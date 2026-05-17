import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3100);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const npmCommand = process.env.npm_execpath
  ? `node ${process.env.npm_execpath}`
  : "npm";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `PORT=${PORT} E2E_TEST_AUTH_BYPASS=true NEXTAUTH_SECRET=e2e-secret-that-is-long-enough-for-nextauth NEXTAUTH_URL=${baseURL} NEXT_PUBLIC_APP_URL=${baseURL} GITHUB_ID=e2e-client GITHUB_SECRET=e2e-secret NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=e2e-anon-key SUPABASE_SERVICE_ROLE_KEY=e2e-service-role-key ${npmCommand} run dev`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
