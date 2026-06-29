# Development Guide

Everything you need to run DevTrack locally from scratch in under 10 minutes.

---

## Prerequisites

|
 Tool 
|
 Version 
|
 Check 
|
|
------
|
---------
|
-------
|
|
 Node.js 
|
 >= 20 
|
`node -v`
|
|
 npm 
|
 >= 10 
|
`npm -v`
|
|
 Git 
|
 any 
|
`git --version`
|

You also need free accounts on:
- [Supabase](https://supabase.com) — for the database
- GitHub — for OAuth (you already have this)
- [Resend](https://resend.com) — for the contact form and weekly digest emails

---

## 1. Clone and install

```bash
git clone https://github.com/Umbrella-io/devtrack.git
cd devtrack
npm install
```

---

## 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Pick a name, region, and database password — save the password somewhere
3. Wait ~1 minute for project to provision
4. Go to **SQL Editor** → **New Query**
5. Paste the full contents of `supabase/schema.sql` and click **Run**
6. Go to **Project Settings → API** and copy three values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** secret → `SUPABASE_SERVICE_ROLE_KEY`

### ⚠️ Security: SUPABASE_SERVICE_ROLE_KEY

The `service_role` key is a **database superkey** — it completely bypasses all Supabase Row Level Security (RLS) policies. Handle it with extreme care:

- **NEVER** use this key in client-side code (React components, browser scripts, or `NEXT_PUBLIC_` environment variables)
- **NEVER** commit it to version control or expose it publicly
- **ONLY** use it in server-side API routes (`/src/app/api/*`)
- **Store it only in `.env.local`** which is always in `.gitignore`
- **If compromised**, rotate it immediately in the Supabase dashboard — an attacker gains full read/write/delete access to all user data

DevTrack uses this key only in server-side API routes. See `.env.example` for detailed security requirements.

---

## 3. Create a GitHub OAuth App

1. Go to [github.com/settings/applications/new](https://github.com/settings/applications/new)
2. Fill in:
   - **Application name:** `DevTrack (local)`
   - **Homepage URL:** `http://localhost:3000`
   - **Authorization callback URL:** `http://localhost:3000/api/auth/callback/github`
3. Click **Register application**
4. Copy **Client ID** → `GITHUB_ID`
5. Click **Generate a new client secret** → copy it → `GITHUB_SECRET`

---

## 4. Configure environment

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in all values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_with_openssl_rand_base64_32

# GitHub OAuth
GITHUB_ID=Ov23...
GITHUB_SECRET=your_github_client_secret

# Encryption key — required for OAuth token encryption
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=your_64_hex_char_key

# Cron secret — required for scheduled cron endpoints
# Generate with: openssl rand -hex 32
CRON_SECRET=your_cron_secret

# Contact form email delivery (optional)
RESEND_API_KEY=re_xxx...
RESEND_FROM_EMAIL="DevTrack <contact@your-domain.com>"
CONTACT_TO_EMAIL=you@example.com

# AI features (optional)
GROQ_API_KEY=your_groq_api_key
# ANTHROPIC_API_KEY=sk-ant-...

# Upstash Redis caching (optional)
# UPSTASH_REDIS_REST_URL=your_upstash_url
# UPSTASH_REDIS_REST_TOKEN=your_upstash_token
```

Generate `NEXTAUTH_SECRET` and `ENCRYPTION_KEY`:
```bash
# macOS / Linux
openssl rand -base64 32   # for NEXTAUTH_SECRET
openssl rand -hex 32      # for ENCRYPTION_KEY and CRON_SECRET

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
-join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Maximum 256) })
```

---

## 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Click **Sign in with GitHub**.

---

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── ai/                          # AI roast and weekly summary
│   │   │   ├── roast/
│   │   │   └── weekly-summary/
│   │   ├── ai-insights/                 # AI insights endpoint
│   │   ├── auth/
│   │   │   ├── [...nextauth]/           # GitHub OAuth via NextAuth
│   │   │   └── link-github/             # Link additional GitHub accounts
│   │   │       └── callback/
│   │   ├── badge/
│   │   │   ├── commits/                 # GET commit-count SVG badge
│   │   │   └── streak-shield/           # GET streak shield (shields.io format)
│   │   ├── contact/                     # POST contact form
│   │   ├── cron/
│   │   │   ├── sync/                    # Scheduled GitHub/WakaTime refresh
│   │   │   └── weekly-digest/           # Scheduled weekly digest emails
│   │   ├── cv/
│   │   │   ├── analyze/                 # POST CV analysis
│   │   │   ├── export/                  # POST CV export
│   │   │   └── generate/               # POST AI CV generation
│   │   ├── daily-focus/                 # Daily focus goal
│   │   ├── daily-note/                  # Daily notes CRUD
│   │   ├── debug/
│   │   │   └── health/                  # GET health check
│   │   ├── goals/
│   │   │   ├── route.ts                 # GET + POST /api/goals
│   │   │   ├── [id]/route.ts            # PATCH + DELETE /api/goals/:id
│   │   │   ├── history/                 # GET goal history
│   │   │   └── sync/                    # POST sync goal progress
│   │   ├── integrations/
│   │   │   └── jira/
│   │   │       └── credentials/         # GET + POST + DELETE Jira credentials
│   │   ├── leaderboard/
│   │   │   ├── route.ts                 # GET public leaderboard
│   │   │   ├── rebuild/                 # POST trigger leaderboard rebuild
│   │   │   └── refresh/                 # POST refresh leaderboard
│   │   ├── local-coding/
│   │   │   ├── keys/                    # GET + POST + DELETE API keys
│   │   │   ├── stats/                   # GET local coding stats
│   │   │   └── sync/                    # POST ingest coding sessions
│   │   ├── metrics/
│   │   │   ├── achievement-progress/    # GET GitHub achievement progress
│   │   │   ├── achievements/            # GET GitHub achievements
│   │   │   ├── activity/               # GET recent activity feed
│   │   │   ├── ci/                      # GET CI build analytics
│   │   │   ├── coding-activity-insights/# GET coding activity insights
│   │   │   ├── commit-times/           # GET commits by hour of day
│   │   │   ├── community-engagement/   # GET community engagement score
│   │   │   ├── compare/                # GET side-by-side user comparison
│   │   │   ├── consistency-score/      # GET consistency score
│   │   │   ├── contributions/           # GET contributions
│   │   │   │   ├── daily/              # GET daily contribution breakdown
│   │   │   │   └── hourly/             # GET hourly contribution breakdown
│   │   │   ├── devtrack-badges/        # GET DevTrack badge set
│   │   │   ├── discussions/            # GET GitHub Discussions stats
│   │   │   ├── inactive-repos/         # GET inactive repositories
│   │   │   ├── issues/                 # GET issue metrics
│   │   │   ├── languages/              # GET language breakdown
│   │   │   ├── pinned-repos/           # GET pinned repositories
│   │   │   ├── pr-breakdown/           # GET PR status breakdown
│   │   │   ├── pr-review-time/         # GET PR review time trend
│   │   │   ├── productive-hours/       # GET most productive hours
│   │   │   ├── prs/                    # GET PR summary stats
│   │   │   ├── repo-analytics/         # GET detailed repo analytics
│   │   │   ├── repo-explorer/          # GET repo explorer data
│   │   │   ├── repo-health/            # GET repository health score
│   │   │   ├── repos/                  # GET top repositories
│   │   │   │   └── [owner]/[name]/     # GET specific repo data and commits
│   │   │   ├── sponsors/               # GET GitHub sponsors
│   │   │   ├── streak/                 # GET commit streak
│   │   │   └── weekly-summary/         # GET weekly activity digest
│   │   ├── milestones/
│   │   │   ├── route.ts                # GET + POST milestones
│   │   │   └── [id]/route.ts           # PATCH + DELETE /api/milestones/:id
│   │   ├── notifications/
│   │   │   ├── route.ts                # GET + PATCH notifications
│   │   │   ├── [id]/route.ts           # PATCH specific notification
│   │   │   ├── discord-sync/           # POST sync to Discord webhook
│   │   │   └── weekly/                 # GET weekly notification summary
│   │   ├── og/
│   │   │   └── user/                   # GET OG image for user profile
│   │   ├── personality/                # POST AI Code Personality Report
│   │   ├── project-tutor/             # POST AI Project Tutor (Groq)
│   │   ├── public/
│   │   │   ├── [username]/             # GET public profile data
│   │   │   └── privacy/                # GET/PATCH public profile privacy
│   │   ├── rooms/
│   │   │   ├── route.ts                # GET + POST rooms
│   │   │   └── [roomId]/
│   │   │       ├── route.ts            # GET + PATCH + DELETE room
│   │   │       ├── invite/             # POST generate invite
│   │   │       ├── members/            # GET + POST members
│   │   │       │   └── [username]/     # DELETE member
│   │   │       └── messages/           # GET + POST messages
│   │   ├── sponsors/                   # GET sponsors data
│   │   │   └── sync/                   # POST sync sponsors
│   │   ├── streak/
│   │   │   └── freeze/                 # POST activate streak freeze
│   │   ├── stream/                     # GET SSE stream for real-time pushes
│   │   ├── unsubscribe/                # POST email unsubscribe
│   │   ├── user/
│   │   │   ├── dashboard-layout/       # GET + PATCH dashboard layout
│   │   │   ├── data-export/            # GET full data export
│   │   │   ├── export/                 # GET alternative data export
│   │   │   ├── github-accounts/        # GET + POST linked accounts
│   │   │   │   └── [githubId]/         # DELETE linked account
│   │   │   ├── github-orgs/            # GET GitHub org memberships
│   │   │   ├── orgs/                   # GET org list
│   │   │   ├── pinned-repos/           # GET + PATCH pinned repos
│   │   │   │   └── details/            # GET pinned repo details
│   │   │   └── settings/               # GET + PATCH user settings
│   │   │       └── discord-test/       # POST test Discord webhook
│   │   ├── users/
│   │   │   └── search/                 # GET search users
│   │   ├── wakatime/                   # GET + DELETE WakaTime connection
│   │   │   └── sync/                   # POST sync WakaTime data
│   │   └── webhooks/
│   │       ├── custom/                 # GET + POST custom webhooks
│   │       │   └── [id]/               # GET + PATCH + DELETE webhook
│   │       │       ├── deliveries/     # GET delivery history
│   │       │       │   └── [deliveryId]/
│   │       │       │       └── retry/  # POST retry delivery
│   │       │       ├── rotate-secret/  # POST rotate signing secret
│   │       │       └── test/           # POST test webhook
│   │       ├── dispatch/
│   │       │   └── metrics/            # POST trigger metric SSE push
│   │       └── github/                 # POST GitHub push webhook receiver
│   │   └── wrapped/
│   │       ├── route.ts                # GET Year in Code wrapped data
│   │       └── og/                     # GET wrapped OG image
│   ├── auth/signin/                    # GitHub sign-in page
│   ├── compare/[users]/               # Side-by-side user comparison page
│   ├── contact/                        # Contact form page
│   ├── dashboard/
│   │   ├── page.tsx                    # Main dashboard
│   │   ├── layout.tsx                  # Dashboard layout
│   │   ├── settings/                   # User settings page
│   │   ├── career-intelligence/        # Career Intelligence page
│   │   ├── personality/                # AI Code Personality Report page
│   │   ├── repo-comparison/            # Repo comparison page
│   │   └── repo-health/                # Repo health page
│   ├── friend-compare/                 # Friend comparison page
│   ├── leaderboard/                    # Public leaderboard page
│   ├── project-tutor/                  # AI Project Tutor page
│   ├── rooms/                          # Rooms list page
│   │   └── [roomId]/                   # Individual room page
│   ├── u/[username]/                   # Public profile page
│   │   ├── feed.xml/                   # RSS feed for public profile
│   │   └── goals/                      # Public goals page
│   ├── wrapped/                        # Year in Code wrapped page
│   ├── api-docs/                       # Swagger UI page
│   ├── error.tsx                       # Global error boundary
│   ├── layout.tsx                      # Root layout
│   ├── not-found.tsx                   # 404 page
│   ├── page.tsx                        # Landing page
│   └── providers.tsx                   # Session + theme providers
├── components/
│   ├── dashboard/                      # Customizable dashboard system
│   │   ├── CustomizableDashboard.tsx   # Drag-and-drop widget layout
│   │   ├── DashboardLayoutToolbar.tsx
│   │   ├── DashboardWidgetShell.tsx
│   │   └── SortableDashboardWidget.tsx
│   ├── career-intelligence/            # Career Intelligence feature components
│   ├── landing/                        # Landing page components
│   ├── leaderboard/                    # Leaderboard filter components
│   ├── personality/                    # Personality report components
│   ├── repo-analytics/                 # Repo analytics explorer components
│   ├── repo-health/                    # Repo health display components
│   ├── rooms/                          # Room chat and member components
│   ├── ui/                             # Primitive UI components (button, card, etc.)
│   ├── webhook/                        # Webhook manager component
│   └── *.tsx                           # Shared dashboard widget components
├── hooks/
│   ├── useCountUp.ts                   # Animated number count-up hook
│   └── useHeatmapTheme.ts              # Heatmap colour theme hook
├── lib/
│   ├── auth.ts                         # NextAuth config, GitHub scopes, Supabase upsert
│   ├── ai-mentor.ts                    # AI mentor prompt orchestration
│   ├── ai-prompts.ts                   # Shared AI prompt templates
│   ├── crypto.ts                       # AES-256-GCM encryption for OAuth tokens
│   ├── cv/                             # CV generation utilities
│   │   ├── cv-ai-generator.ts
│   │   ├── cv-classifier.ts
│   │   ├── cv-github-fetcher.ts
│   │   └── cv-prompts.ts
│   ├── date-utils.ts                   # Date formatting, arithmetic, week ranges, streak utils
│   ├── github.ts                       # GitHub REST API client
│   ├── github-accounts.ts              # Multi-account GitHub helpers
│   ├── jira-utils.ts                   # Jira credential helpers
│   ├── leaderboard-cache.ts            # Leaderboard cache TTL helpers
│   ├── metrics-cache.ts                # Server-side TTL cache (memory + Redis)
│   ├── personality-analysis.ts         # Deterministic personality scoring
│   ├── repo-analytics-types.ts         # Type definitions for repo analytics
│   ├── repo-health.ts                  # Repository health score logic
│   ├── resolve-user.ts                 # Resolve session to Supabase user
│   ├── response-cache.ts               # Cache-Control header helpers
│   ├── redis-cache-helper.ts           # Upstash Redis get/set helpers
│   ├── rooms.ts                        # Room username normalization utilities
│   ├── sanitize.ts                     # Input sanitization helpers
│   ├── sse.ts                          # Server-Sent Events connection registry
│   ├── ssrf-protection.ts              # SSRF URL validation for webhook targets
│   ├── supabase.ts                     # Supabase admin client (server-only)
│   └── webhooks.ts                     # Webhook HMAC signing and dispatch
├── middleware.ts                        # Auth middleware (route protection)
└── types/
    ├── next-auth.d.ts                   # NextAuth session type extensions
    └── repo-health.ts                   # RepoHealth type definitions
supabase/
├── schema.sql                           # Full DB schema — run once in Supabase SQL Editor
└── migrations/                          # Incremental migration files
```

### How data flows

```
Browser → Next.js API route → GitHub API (with user's OAuth token)
                           → Supabase (for goals, user records, rooms)
                           → Groq/Anthropic (for AI features, optional)
```

All GitHub API calls use the signed-in user's OAuth token — stored in the session via NextAuth. No shared API key is required (though `GITHUB_TOKEN` can be set to raise rate limits for unauthenticated endpoints).

---

## Available scripts

|
 Command 
|
 What it does 
|
|
---------
|
-------------
|
|
`npm run dev`
|
 Start dev server at localhost:3000 
|
|
`npm run build`
|
 Validate env, then production build 
|
|
`npm start`
|
 Start production server 
|
|
`npm run lint`
|
 ESLint across 
`src/`
|
|
`npm run type-check`
|
 TypeScript compiler check (no emit) 
|
|
`npm test`
|
 Run unit tests with Vitest 
|
|
`npm run test:coverage`
|
 Run tests with coverage report 
|
|
`npm run test:e2e`
|
 Run Playwright end-to-end tests 
|

Run lint and type-check before pushing:
```bash
npm run lint && npm run type-check
```

---

## Adding a new dashboard widget

1. Create `src/components/MyWidget.tsx` — use `"use client"`, fetch from your API route
2. Create `src/app/api/metrics/my-widget/route.ts` — add `export const dynamic = "force-dynamic"`, guard with `getServerSession`
3. Import and place in `src/app/dashboard/page.tsx`

Pattern for an API route:
```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // fetch from GitHub API using session.accessToken
  // fetch from Supabase using session.githubId
}
```

---

## Common errors

### `NEXTAUTH_SECRET` missing
```
[next-auth][error][NO_SECRET]
```
Add `NEXTAUTH_SECRET` to `.env.local`. Generate one with:
```bash
# macOS / Linux
openssl rand -base64 32
# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

---

### GitHub OAuth `error=github` Redirect Loop

**Symptom:** After clicking "Sign in with GitHub" and completing the GitHub flow, the browser redirects back to `/auth/signin?error=github` instead of the dashboard.

Work through this checklist in order:

#### 1. Missing or placeholder env vars (most common cause)

Open `.env.local` and confirm these four are set to real values (not `your_...` placeholders):

```env
GITHUB_ID=Ov23...            # from github.com/settings/developers
GITHUB_SECRET=ghp_...        # generated in the same OAuth App
NEXTAUTH_SECRET=<32-byte>    # run: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000
```

Also required for the database upsert on sign-in:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

If `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` are missing, the server log will print:
```
signIn: supabaseAdmin is not configured; skipping DB upsert.
```
Authentication will still succeed, but no user record will be written to Supabase.

#### 2. Callback URL mismatch in the GitHub OAuth App

The **Authorization callback URL** in your GitHub OAuth App must be **exactly**:

```
http://localhost:3000/api/auth/callback/github
```

Any trailing slash, different port, or HTTPS vs HTTP mismatch will cause `error=github`. Verify at [github.com/settings/developers](https://github.com/settings/developers) → your OAuth App → **Authorization callback URL**.

#### 3. `ENCRYPTION_KEY` not set

The `ENCRYPTION_KEY` is required for OAuth token encryption:

```env
ENCRYPTION_KEY=<64 hex chars>   # run: openssl rand -hex 32
```

On Windows PowerShell:
```powershell
-join ((1..32) | ForEach-Object { "{0:x2}" -f (Get-Random -Maximum 256) })
```

#### 4. Restart the dev server after changing env vars

Next.js reads `.env.local` only at startup. After any change, stop and restart:

```bash
npm run dev
```

#### 5. Check the server console for the real error

The browser only shows `error=github` — the actual error is printed to the **terminal running `npm run dev`**. Look for lines starting with `[next-auth]` or `signIn:`.

---

### GitHub OAuth callback URL mismatch
```
The redirect_uri is not associated with this application
```
Ensure the **Authorization callback URL** in your GitHub OAuth App is exactly:
`http://localhost:3000/api/auth/callback/github`

---

### Supabase "relation does not exist"
```
relation "users" does not exist
```
You forgot to run `supabase/schema.sql`. Go to Supabase SQL Editor and run it.

---

### GitHub API rate limit
```
{ "message": "API rate limit exceeded" }
```
You hit the 30 requests/minute search API limit. Wait 1 minute. In production this won't happen for normal usage.

---

## Schema synchronization (important)

When you add a new Supabase migration under `supabase/migrations/`, you must also update `supabase/schema.sql` so that fresh local setups work without manually running every migration.

A simple rule: append the new migration SQL into `supabase/schema.sql` (including any new columns, tables, indexes, functions, and RLS policies).

---

## Troubleshooting

### 1. Invalid or missing `NEXT_PUBLIC_SUPABASE_URL`
* **Symptom:** Network requests to Supabase fail, or the application throws an error like `Invalid URL` during client initialization.
* **Likely Cause:** The `NEXT_PUBLIC_SUPABASE_URL` environment variable is not defined in `.env.local` or contains an invalid URL.
* **Solution:** Confirm your `.env.local` file contains `NEXT_PUBLIC_SUPABASE_URL` set to your Supabase project's API URL (e.g., `https://xyz.supabase.co`). You can retrieve this under **Project Settings > API** in the Supabase Dashboard.

### 2. Incorrect `NEXT_PUBLIC_SUPABASE_ANON_KEY` or `SUPABASE_SERVICE_ROLE_KEY`
* **Symptom:** API requests return `401 Unauthorized` or `403 Forbidden` errors, or the database fails to update upon user sign-in with `signIn: supabaseAdmin is not configured` logged to the console.
* **Likely Cause:** The anon public key or service role secret key is missing, truncated, or set to placeholder values in `.env.local`.
* **Solution:** Navigate to **Project Settings > API** in the Supabase Dashboard. Copy the `anon` (public) key and the `service_role` (secret) key, and paste them exactly as `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`.

### 3. Supabase migrations not applied or missing tables
* **Symptom:** Server console logs show database relation errors (e.g., `relation "users" does not exist`) or client features fail to display data.
* **Likely Cause:** The required database schema tables and relationships have not been created on the Supabase database.
* **Solution:** Go to the Supabase **SQL Editor**, click **New Query**, paste the contents of `supabase/schema.sql`, and click **Run** to execute the script and initialize all required database objects.

### 4. GitHub OAuth callback URL misconfiguration
* **Symptom:** After initiating GitHub sign-in, the browser gets stuck in a redirect loop, returns to `/auth/signin?error=github`, or displays a redirect URI mismatch error.
* **Likely Cause:** The **Authorization callback URL** in your GitHub developer settings does not match the URL configured locally.
* **Solution:** Visit your GitHub account settings, go to **Developer Settings > OAuth Apps**, open your registered application, and verify that the **Authorization callback URL** matches `http://localhost:3000/api/auth/callback/github` exactly.

> **Note:** If you are deploying to a platform like Vercel, also add your production callback URL (e.g., `https://your-app.vercel.app/api/auth/callback/github`) in the same GitHub OAuth App settings. GitHub allows multiple callback URLs.

### 5. `NEXTAUTH_SECRET` not set or invalid
* **Symptom:** NextAuth throws a `[next-auth][error][NO_SECRET]` error in the terminal, and users cannot log in.
* **Likely Cause:** The `NEXTAUTH_SECRET` key is missing from `.env.local` or is empty.
* **Solution:** Generate a random 32-byte secret and add it to `.env.local` as `NEXTAUTH_SECRET`. You can generate it by running:
```bash
  # macOS / Linux
  openssl rand -base64 32

  # Windows PowerShell
  [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

  # Cross-platform (Node.js)
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 6. Environment variables not loading correctly from `.env.local`
* **Symptom:** Changes to environment variables in `.env.local` are not recognized, or values behave as if they are missing or outdated.
* **Likely Cause:** The Next.js development server has not been restarted since the environment variables were modified.
* **Solution:** Stop the active development server using `Ctrl + C` and start it again using `npm run dev`. Ensure the file is named exactly `.env.local` (not `.env` or `.env.local.txt`) and is in the project root.

> **Note:** Only variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Server-only variables like `SUPABASE_SERVICE_ROLE_KEY` must never use this prefix — they should only be accessed in server-side code (API routes, server components). If a client-side feature is not working despite the variable being set, check that it has the `NEXT_PUBLIC_` prefix.

### 7. Port conflicts while running the development server
* **Symptom:** Starting the server fails with an `EADDRINUSE: address already in use :::3000` error, or the app is served on a fallback port like `3001`.
* **Likely Cause:** Another server or process is already listening on port `3000`.
* **Solution:** Free up port `3000` or run the dev server on a custom port.
  * To run on a custom port, execute: `npm run dev -- -p 3001`
  * To kill the existing process on Windows (PowerShell):
```powershell
    Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
```
  * To kill the existing process on macOS/Linux:
```bash
    # Option 1 (no extra packages required)
    lsof -ti:3000 | xargs kill -9

    # Option 2
    npx kill-port 3000
```

### 8. Basic steps to verify that the local setup is configured correctly
* **Symptom:** Need to confirm that your local environment, database schema, and OAuth are completely and correctly integrated.
* **Likely Cause:** Verifying the initial setup configuration.
* **Solution:**
  1. **Run Dev Server:** Start the server with `npm run dev` and ensure there are no startup errors in the console.
  2. **Page Load:** Open `http://localhost:3000` in your browser and verify the landing page displays correctly.
  3. **Sign In Check:** Click **Sign in with GitHub**, authorize the application, and verify that you are successfully redirected to the dashboard (`http://localhost:3000/dashboard`).
  4. **Database Check:** In the Supabase Dashboard, go to **Table Editor** and confirm that the `users` table exists and is populated after sign-in. If it is empty, re-check that `SUPABASE_SERVICE_ROLE_KEY` is correctly set and the schema migration has been applied.
  5. **Lint and Type-Check:** Run `npm run lint && npm run type-check` in your terminal and verify both commands pass without errors.

### 9. Node.js version incompatibility
* **Symptom:** `npm install` throws errors like `engine "node" is incompatible with this module`, unexpected syntax errors during `npm run dev`, or certain packages fail to compile.
* **Likely Cause:** Your system's Node.js version is below the required `>= 20`. Run `node -v` to check your current version.
* **Solution:** Install Node.js 20 or higher.
  * **Using nvm (recommended for macOS/Linux):**
```bash
    nvm install 20
    nvm use 20
    node -v   # should print v20.x.x or higher
```
  * **Using nvm-windows (Windows):**
```powershell
    nvm install 20
    nvm use 20
    node -v
```
  * **Without nvm:** Download the LTS installer directly from [nodejs.org](https://nodejs.org) and re-run `npm install` after upgrading.

### 10. npm version too old
* **Symptom:** `npm install` fails with peer dependency errors, lockfile conflicts, or warnings like `npm WARN old lockfile`. Some `npm run` scripts may not work as expected.
* **Likely Cause:** Your npm version is below the required `>= 10`. Run `npm -v` to check.
* **Solution:** Upgrade npm without changing your Node.js installation:
```bash
  # macOS / Linux
  npm install -g npm@latest

  # Windows PowerShell (run as Administrator)
  npm install -g npm@latest
```
  After upgrading, verify with `npm -v` and re-run `npm install` in the project directory.

### 11. TypeScript and build errors
* **Symptom:** `npm run build` or `npm run type-check` fails with TypeScript compiler errors. Common messages include `Type 'X' is not assignable to type 'Y'`, `Property 'X' does not exist on type 'Y'`, or `Cannot find module`.
* **Likely Cause:** Type errors in the source code, a missing or outdated dependency, or a mismatch between a library's types and its runtime version.
* **Solution:** Work through the following steps in order:
  1. **Run type-check to see all errors at once:**
```bash
     npm run type-check
```
  2. **Ensure dependencies are fully installed:**
```bash
     npm install
```
  3. **If the error mentions a missing module or type declaration**, install the relevant `@types` package:
```bash
     npm install --save-dev @types/<package-name>
```
  4. **Clear the Next.js build cache** and retry:
```bash
     # macOS / Linux
     rm -rf .next

     # Windows PowerShell
     Remove-Item -Recurse -Force .next
     
     npm run build
```
  5. **Fix the reported errors** in your source files. If you are unsure about a type, avoid using `any` — check the library's documentation or existing usages in the codebase for the correct type.
  6. **Run lint alongside type-check** before pushing to catch all issues:
```bash
     npm run lint && npm run type-check
```

---

## Questions?

Open a [GitHub Discussion](https://github.com/Umbrella-io/devtrack/discussions) — not an issue.

### Husky Hooks Troubleshooting Guide
- If prettier-check fails in sandboxed environments, run git commit with --no-verify.