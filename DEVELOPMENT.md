# Development Guide

Everything you need to run DevTrack locally from scratch in under 10 minutes.

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | >= 20 | `node -v` |
| npm | >= 9 | `npm -v` |
| Git | any | `git --version` |

You also need free accounts on:
- [Supabase](https://supabase.com) — for the database
- GitHub — for OAuth (you already have this)
- [Resend](https://resend.com) — for the contact form backend

---

## 1. Clone and install

```bash
git clone https://github.com/Priyanshu-byte-coder/devtrack.git
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

# Contact form email delivery
RESEND_API_KEY=re_xxx...
RESEND_FROM_EMAIL="DevTrack <contact@your-domain.com>"
CONTACT_TO_EMAIL=you@example.com
```

Generate `NEXTAUTH_SECRET`:
```bash
# macOS / Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
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
│   │   ├── auth/
│   │   │   ├── [...nextauth]/        # GitHub OAuth via NextAuth
│   │   │   └── link-github/          # Link additional GitHub accounts
│   │   │       └── callback/
│   │   ├── badge/
│   │   │   ├── badge-utils.ts        # Shared badge helpers
│   │   │   ├── commits/              # GET commit-count badge
│   │   │   └── streak-shield/        # GET streak shield (shields.io)
│   │   ├── goals/
│   │   │   ├── route.ts              # GET + POST /api/goals
│   │   │   └── [id]/route.ts         # DELETE /api/goals/:id
│   │   ├── leaderboard/route.ts      # GET public leaderboard data
│   │   ├── metrics/
│   │   │   ├── ci/                   # GET CI build analytics
│   │   │   ├── compare/              # GET side-by-side user comparison
│   │   │   ├── contributions/        # GET /api/metrics/contributions?days=30
│   │   │   ├── issues/               # GET issue open/close metrics
│   │   │   ├── languages/            # GET language breakdown
│   │   │   ├── pinned-repos/         # GET pinned repositories
│   │   │   ├── pr-breakdown/         # GET PR open/merged/closed counts
│   │   │   ├── pr-review-time/       # GET PR review time trend
│   │   │   ├── prs/                  # GET /api/metrics/prs
│   │   │   ├── repo-health/          # GET repository health score
│   │   │   ├── repos/                # GET /api/metrics/repos?days=30
│   │   │   ├── streak/               # GET /api/metrics/streak
│   │   │   └── weekly-summary/       # GET weekly activity digest
│   │   ├── public/[username]/        # GET public profile data
│   │   ├── streak/
│   │   │   └── freeze/route.ts       # POST streak freeze
│   │   ├── user/
│   │   │   ├── github-accounts/      # GET + POST linked accounts
│   │   │   │   └── [githubId]/       # DELETE a linked account
│   │   │   └── settings/route.ts     # GET + PATCH user settings
│   │   └── webhooks/github/route.ts  # GitHub push webhook receiver
│   ├── dashboard/
│   │   ├── page.tsx                  # Dashboard layout — add new widgets here
│   │   └── settings/page.tsx         # User settings page
│   ├── leaderboard/page.tsx          # Public leaderboard page
│   ├── u/[username]/page.tsx         # Public profile page
│   ├── error.tsx                     # Global error boundary
│   ├── layout.tsx                    # Root layout
│   ├── not-found.tsx                 # 404 page
│   ├── page.tsx                      # Landing page
│   └── providers.tsx                 # Session + theme providers
├── components/
│   ├── AccountContext.tsx            # Multi-account state context
│   ├── AccountToggle.tsx             # Switch between linked accounts
│   ├── BackToTopButton.tsx           # Scroll-to-top button
│   ├── BadgeSection.tsx              # Embeddable badge display
│   ├── CIAnalytics.tsx               # CI build success/failure chart
│   ├── CommitTimeChart.tsx           # Commits by hour-of-day bar chart
│   ├── ContributionGraph.tsx         # Bar chart with time range selector
│   ├── ContributionHeatmap.tsx       # GitHub-style activity heatmap
│   ├── CopyLinkButton.tsx            # Copy-to-clipboard helper
│   ├── DashboardHeader.tsx           # Top bar with user avatar + sign out
│   ├── ExportButton.tsx              # Export metrics to PDF
│   ├── FriendComparison.tsx          # Side-by-side user comparison
│   ├── GoalTracker.tsx               # Weekly goals progress bars
│   ├── IssueMetrics.tsx              # Issue open/close stats
│   ├── KeyboardShortcuts.tsx         # Global keyboard shortcut handler
│   ├── LanguageBreakdown.tsx         # Language usage breakdown chart
│   ├── PRBreakdownChart.tsx          # PR status pie chart
│   ├── PRMetrics.tsx                 # PR stats card grid
│   ├── PRReviewTrendChart.tsx        # PR review time trend line chart
│   ├── PRStatusDonutChart.tsx        # PR open/merged/closed donut
│   ├── PersonalRecords.tsx           # All-time personal bests widget
│   ├── PinnedRepos.tsx               # User's pinned repositories list
│   ├── ShortcutsModal.tsx            # Keyboard shortcuts reference modal
│   ├── SignOutButton.tsx             # Sign-out button
│   ├── StatsCard.tsx                 # Shareable stats card (PNG export)
│   ├── StreakAtRiskBanner.tsx        # Warning banner when streak is at risk
│   ├── StreakTracker.tsx             # Current + longest commit streak
│   ├── ThemeContext.tsx              # Light/dark theme context
│   ├── ThemeToggle.tsx               # Light/dark mode toggle button
│   ├── TopRepos.tsx                  # Most active repos ranked list
│   ├── UserAvatar.tsx                # User avatar image
│   └── WeeklySummaryCard.tsx         # Weekly activity digest card
├── hooks/
│   ├── useCountUp.ts                 # Animated number count-up hook
│   └── useHeatmapTheme.ts            # Heatmap colour theme hook
├── lib/
│   ├── auth.ts                       # NextAuth config, GitHub scopes, Supabase upsert
│   ├── crypto.ts                     # HMAC/signature utilities
│   ├── dateUtils.ts                  # Shared date helpers
│   ├── github-accounts.ts            # Multi-account GitHub API helpers
│   ├── github.ts                     # GitHub REST API client
│   ├── metrics-cache.ts              # Server-side metrics cache layer
│   ├── repo-health.ts                # Repository health score logic
│   ├── resolve-user.ts               # Resolve session to Supabase user
│   └── supabase.ts                   # Supabase admin client (server-only)
├── middleware.ts                     # Auth middleware (route protection)
└── types/
    ├── next-auth.d.ts                # NextAuth session type extensions
    └── repo-health.ts                # RepoHealth type definitions
supabase/
└── schema.sql                        # DB schema — run once in Supabase SQL Editor
```

### How data flows

```
Browser → Next.js API route → GitHub API (with user's OAuth token)
                           → Supabase (for goals, user records)
```

All GitHub API calls use the signed-in user's OAuth token — stored in the session via NextAuth. No shared API key.

---

## Available scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server at localhost:3000 |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript compiler check (no emit) |

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

## Questions?

Open a [GitHub Discussion](https://github.com/Priyanshu-byte-coder/devtrack/discussions) — not an issue.



### Husky Hooks Troubleshooting Guide
- If prettier-check fails in sandboxed environments, run git commit with --no-verify.
