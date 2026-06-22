# Architecture

## 1. High-Level Architecture

Browser -> Next.js App (Vercel)
  |-- /app/page.tsx                 Landing page
  |-- /app/dashboard/page.tsx       Dashboard (auth-guarded)
  +-- /app/api/
        |-- auth/[...nextauth]/     GitHub OAuth
        |-- metrics/contributions/  Commit activity
        |-- metrics/prs/            PR analytics
        |-- metrics/streak/         Commit streak
        |-- metrics/repos/          Top repositories
        +-- goals/                  Supabase weekly goals

## 2. Folder Structure

devtrack/
|-- src/
|   |-- app/
|   |   |-- api/
|   |   |   |-- auth/[...nextauth]/     # GitHub OAuth
|   |   |   |-- metrics/contributions/  # GET commit activity
|   |   |   |-- metrics/prs/            # GET PR analytics
|   |   |   |-- metrics/streak/         # GET commit streak
|   |   |   |-- metrics/repos/          # GET top repositories
|   |   |   +-- goals/                  # GET + POST weekly goals
|   |   |-- dashboard/page.tsx          # Main dashboard
|   |   +-- page.tsx                    # Landing page
|   |-- components/
|   |   |-- ContributionGraph.tsx
|   |   |-- PRMetrics.tsx
|   |   |-- GoalTracker.tsx
|   |   |-- StreakTracker.tsx
|   |   |-- TopRepos.tsx
|   |   +-- DashboardHeader.tsx
|   +-- lib/
|       |-- auth.ts                     # NextAuth config
|       +-- supabase.ts                 # Supabase admin client
|-- supabase/schema.sql
+-- .github/workflows/ci.yml

## 3. Data Flow

User visits /dashboard
  -> NextAuth checks session
  -> no session: redirect to /
  -> session ok: render dashboard

Each component fetches its own API route:
  ContributionGraph -> GET /api/metrics/contributions -> GitHub GraphQL -> Recharts
  StreakTracker     -> GET /api/metrics/streak
  PRMetrics         -> GET /api/metrics/prs
  TopRepos          -> GET /api/metrics/repos
  GoalTracker       -> GET/POST /api/goals (Supabase)

## 4. State Management

No global state library is used.
- Each widget manages its own data via useEffect + fetch
- Loading/error states are local useState per component
- Auth state comes from NextAuth.js SessionProvider (React context)
- Goal state is re-fetched after every POST

## 5. Key Components

| Component | Responsibility |
|---|---|
| ContributionGraph.tsx | Commit activity bar chart, time range selector |
| StreakTracker.tsx | Current streak, longest streak, active days |
| PRMetrics.tsx | Avg review time, merge rate, open/closed PR counts |
| TopRepos.tsx | Repositories ranked by commit activity |
| GoalTracker.tsx | Weekly goals via Supabase, progress bars |
| DashboardHeader.tsx | User avatar, name, sign-out button |
| lib/auth.ts | NextAuth config, Supabase user upsert on login |
| lib/supabase.ts | Supabase admin client for server-side operations |

## 6. Environment Variables

| Variable | Purpose |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key |
| SUPABASE_SERVICE_ROLE_KEY | Server-only key, bypasses RLS |
| NEXTAUTH_URL | Full app URL |
| NEXTAUTH_SECRET | Random secret for NextAuth JWTs |
| GITHUB_ID | GitHub OAuth App Client ID |
| GITHUB_SECRET | GitHub OAuth App Client Secret |

See .env.example for a ready-to-fill template.
