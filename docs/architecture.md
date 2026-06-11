# DevTrack Architecture

This page gives new contributors a map of how DevTrack's pages, API routes,
database tables, and external services work together.

## System Overview

```mermaid
flowchart LR
  user["User browser"]
  vercel["Vercel deployment"]

  subgraph frontend["Next.js App Router frontend"]
    landing["/"]
    dashboard["/dashboard"]
    settings["/dashboard/settings"]
    publicProfile["/u/[username]"]
    rooms["/rooms"]
    apiDocs["/api-docs"]
    widgets["Dashboard widgets and shared components"]
  end

  subgraph api["Next.js route handlers"]
    auth["/api/auth/[...nextauth]\nGitHub OAuth session"]
    metrics["/api/metrics/*\ncontributions, PRs, repos, streak,\nlanguages, achievements"]
    goals["/api/goals/*\ngoals, history, sync"]
    userSettings["/api/user/*\nsettings, export, accounts, orgs,\npinned repos, dashboard layout"]
    notifications["/api/notifications/*"]
    publicApi["/api/public/[username]\npublic profile JSON"]
    githubSync["/api/cron/sync\nscheduled GitHub/WakaTime refresh"]
    webhooks["/api/webhooks/*\nGitHub and custom webhooks"]
    wakatime["/api/wakatime/*"]
  end

  subgraph data["Supabase PostgreSQL"]
    users[("users")]
    accounts[("user_github_accounts")]
    goalsTable[("goals")]
    history[("goal_history")]
    snapshots[("metric_snapshots")]
    notificationsTable[("notifications")]
    achievements[("user_github_achievements")]
    wakatimeStats[("wakatime_stats")]
    localCoding[("local_coding_sessions\nlocal_coding_api_keys")]
    webhookTables[("webhook_configs\nwebhook_deliveries")]
    cache[("leaderboard_cache\nai_insights\ndaily_notes")]
  end

  subgraph external["External services"]
    githubOAuth["GitHub OAuth"]
    githubApi["GitHub REST and GraphQL APIs"]
    wakatimeApi["WakaTime API optional"]
    discord["Discord webhooks optional"]
    groq["Groq API optional AI summaries"]
  end

  user --> vercel
  vercel --> landing
  vercel --> dashboard
  vercel --> settings
  vercel --> publicProfile
  dashboard --> widgets
  widgets --> metrics
  widgets --> goals
  widgets --> notifications
  settings --> userSettings
  publicProfile --> publicApi

  auth --> githubOAuth
  auth --> users
  auth --> achievements
  metrics --> githubApi
  metrics --> users
  metrics --> accounts
  metrics --> snapshots
  metrics --> cache
  goals --> goalsTable
  goals --> history
  userSettings --> users
  userSettings --> accounts
  notifications --> notificationsTable
  publicApi --> users
  publicApi --> achievements
  publicApi --> goalsTable
  githubSync --> accounts
  githubSync --> achievements
  githubSync --> wakatimeStats
  githubSync --> githubApi
  githubSync --> wakatimeApi
  webhooks --> webhookTables
  wakatime --> wakatimeApi
  wakatime --> wakatimeStats
  notifications --> discord
  metrics --> groq
```

## GitHub Activity Sync Flow

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant NextAuth as NextAuth GitHub provider
  participant GitHub as GitHub OAuth/API
  participant API as Next.js API routes
  participant DB as Supabase PostgreSQL
  participant UI as Dashboard/Public Profile
  participant Cron as /api/cron/sync

  User->>NextAuth: Sign in with GitHub
  NextAuth->>GitHub: OAuth authorization
  GitHub-->>NextAuth: Access token and profile
  NextAuth->>DB: Upsert users row
  NextAuth->>DB: Best-effort achievement sync
  User->>UI: Open dashboard
  UI->>API: Fetch metrics and settings
  API->>DB: Resolve DevTrack user and linked GitHub accounts
  API->>GitHub: Fetch commits, PRs, repos, discussions, org data
  API->>DB: Read/write cached metrics and user preferences
  API-->>UI: Return normalized widget data
  Cron->>DB: Load linked GitHub accounts and WakaTime-enabled users
  Cron->>GitHub: Refresh GitHub achievements
  Cron->>DB: Store user_github_achievements
  Cron->>DB: Store WakaTime summaries when configured
```

## Frontend

DevTrack uses the Next.js App Router under `src/app`.

| Area | Files | Purpose |
|---|---|---|
| Landing | `src/app/page.tsx`, `src/components/landing/LandingPage.tsx` | Public marketing and product entry point |
| Auth | `src/app/auth/signin/page.tsx`, `src/app/auth/layout.tsx` | GitHub sign-in UI |
| Dashboard | `src/app/dashboard/page.tsx`, `src/app/dashboard/layout.tsx` | Authenticated developer dashboard |
| Settings | `src/app/dashboard/settings/page.tsx` | Public profile, WakaTime, Discord, pinned repo, and privacy settings |
| Public profile | `src/app/u/[username]/page.tsx` | Shareable profile backed by `/api/public/[username]` |
| Repo views | `src/app/dashboard/repo-health/page.tsx`, `src/app/dashboard/repo-comparison/page.tsx` | Repository analysis experiences |
| Community | `src/app/leaderboard/page.tsx`, `src/app/rooms/*` | Public leaderboard and rooms |

The dashboard is composed from reusable widgets in `src/components`, especially
`src/components/dashboard/CustomizableDashboard.tsx`. Widgets call focused API
routes rather than sharing a large client-side data store.

## API Routes

Route handlers live in `src/app/api`.

| Route group | Responsibility |
|---|---|
| `/api/auth/[...nextauth]` | GitHub OAuth through NextAuth, JWT session creation, user upsert, token validation |
| `/api/auth/link-github` | Link additional GitHub accounts for multi-account metrics |
| `/api/metrics/*` | GitHub-derived dashboard metrics such as contributions, PRs, repos, issues, languages, streaks, achievements, CI, repo health, and comparisons |
| `/api/goals/*` | Goal CRUD, goal history, and GitHub-backed goal progress sync |
| `/api/user/*` | Settings, linked accounts, pinned repos, organizations, dashboard layout, data export |
| `/api/notifications/*` | Notification reads, marking read, weekly notifications, Discord sync |
| `/api/public/[username]` | Public profile payload with rate limiting and visibility checks |
| `/api/cron/sync` | Scheduled refresh for WakaTime summaries and GitHub achievements |
| `/api/wakatime/*` | Optional WakaTime connection and sync endpoints |
| `/api/webhooks/*` | GitHub webhook receiver plus user-configured custom webhooks |
| `/api/local-coding/*` | Local coding session API keys, stats, and sync |

Most authenticated routes read the NextAuth session with `getServerSession`,
resolve the DevTrack user via `src/lib/resolve-user.ts`, then use the
server-side Supabase admin client from `src/lib/supabase.ts`.

## Database

Supabase PostgreSQL is the primary datastore. The current codebase does not use
Prisma; the canonical schema and migrations live in `supabase/schema.sql` and
`supabase/migrations`.

```mermaid
erDiagram
  users ||--o{ user_github_accounts : links
  users ||--o{ goals : owns
  users ||--o{ goal_history : records
  users ||--o{ metric_snapshots : captures
  users ||--o{ notifications : receives
  users ||--o{ streak_freezes : configures
  users ||--o| user_github_achievements : syncs
  users ||--o{ daily_notes : writes
  users ||--o{ local_coding_sessions : tracks
  users ||--o{ local_coding_api_keys : authenticates
  users ||--o{ wakatime_stats : imports
  users ||--o{ webhook_configs : owns
  webhook_configs ||--o{ webhook_deliveries : records
  goals ||--o{ goal_history : rolls_up

  users {
    text id PK
    text github_id
    text github_login
    boolean is_public
    text[] pinned_repos
    jsonb dashboard_layout
    text wakatime_api_key_encrypted
  }

  user_github_accounts {
    text id PK
    text user_id FK
    text github_id
    text github_login
    text access_token_encrypted
  }

  goals {
    text id PK
    text user_id FK
    text title
    integer target
    integer current
    text unit
    timestamptz deadline
  }

  metric_snapshots {
    text id PK
    text user_id FK
    integer commits
    integer prs_open
    integer prs_merged
    integer issues_closed
  }

  notifications {
    text id PK
    text user_id FK
    text type
    text message
    boolean read
  }
```

The diagram is intentionally simplified. Tables for rooms, repository health,
leaderboard cache, AI insights, Jira credentials, public widgets, and data
exports are included in migrations but omitted above to keep the onboarding
view readable.

## External Services

| Service | Used by | Notes |
|---|---|---|
| GitHub OAuth | NextAuth provider in `src/lib/auth.ts` | Primary sign-in and access-token source |
| GitHub REST/GraphQL APIs | `src/lib/github*.ts`, `/api/metrics/*`, `/api/cron/sync` | Fetches commits, PRs, repos, achievements, discussions, orgs, and profile data |
| Vercel | App hosting | Runs the Next.js frontend and route handlers |
| Supabase | Database and RLS | Stores users, preferences, linked accounts, goals, notifications, and cached data |
| WakaTime | `/api/wakatime/*`, `/api/cron/sync` | Optional coding-time import when a user stores an encrypted API key |
| Discord | Notification settings | Optional webhook delivery for reminders and alerts |
| Groq | AI routes/widgets | Optional AI summaries and mentor-style insights |

## Operational Notes

- GitHub OAuth tokens are held in the NextAuth JWT session. Additional linked
  account tokens are encrypted before storage in `user_github_accounts`.
- Public profile responses are gated by `users.is_public` and rate limited in
  `/api/public/[username]`.
- Metrics routes use caching helpers from `src/lib/metrics-cache.ts` to reduce
  GitHub API pressure.
- Scheduled sync work is exposed through `/api/cron/sync` and protected by
  `CRON_SECRET` outside development.
- Server-only Supabase access should go through `supabaseAdmin`; browser code
  should use public/anon-safe clients only.
