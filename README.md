# DevTrack

> Open-source developer productivity dashboard — track coding habits, visualize GitHub contribution patterns, and set personal development goals.

![CI](https://github.com/Priyanshu-byte-coder/devtrack/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![GSSoC 2025](https://img.shields.io/badge/GSSoC-2025-orange.svg)
![Tech Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Supabase%20%7C%20TypeScript-blue)
![Good First Issues](https://img.shields.io/github/issues/Priyanshu-byte-coder/devtrack/good%20first%20issue?label=good%20first%20issues&color=7c3aed)

> **Live demo coming soon** — deploy your own in minutes with the guide below.

---

## Problem It Solves

Developer metrics are scattered across GitHub, Jira, Notion, and half a dozen other tools. DevTrack consolidates GitHub activity, PR review times, and issue resolution rates into one clean, self-hostable interface — no enterprise pricing, no vendor lock-in.

---

## Features

| Feature | Description |
|---------|-------------|
| **GitHub OAuth** | Sign in with GitHub — no extra account needed |
| **Commit Activity Chart** | Visualize daily commit activity with 7d / 14d / 30d / 90d range selector |
| **Commit Streak Tracker** | Current streak, longest streak, active days — stay consistent |
| **PR Analytics** | Average review time, merge rate, open/closed PR count |
| **Top Repositories** | Ranked list of your most active repos over any time range |
| **Weekly Goal Tracker** | Set coding goals and track progress with a progress bar UI |
| **No separate backend** | Next.js API routes + Supabase, deploy to Vercel for free |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Auth | GitHub OAuth via NextAuth.js |
| Database | Supabase (PostgreSQL) |
| API | Next.js Route Handlers (`/app/api/`) |
| Charts | Recharts |
| Deployment | Vercel (free, auto-deploys from GitHub) |

---

## Project Structure

```
devtrack/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/   # GitHub OAuth
│   │   │   ├── metrics/
│   │   │   │   ├── contributions/    # GET commit activity
│   │   │   │   ├── prs/              # GET PR analytics
│   │   │   │   ├── streak/           # GET commit streak
│   │   │   │   └── repos/            # GET top repositories
│   │   │   └── goals/                # GET + POST weekly goals
│   │   ├── dashboard/                # Main dashboard page
│   │   └── page.tsx                  # Landing page
│   ├── components/
│   │   ├── ContributionGraph.tsx     # Bar chart with time range tabs
│   │   ├── PRMetrics.tsx             # PR stats grid
│   │   ├── GoalTracker.tsx           # Weekly goals progress bars
│   │   ├── StreakTracker.tsx         # Streak stats widget
│   │   ├── TopRepos.tsx              # Ranked repos list
│   │   └── DashboardHeader.tsx       # User avatar + sign out
│   └── lib/
│       ├── auth.ts                   # NextAuth config + Supabase user upsert
│       └── supabase.ts               # Supabase admin client (server-side)
├── supabase/
│   └── schema.sql                    # Run once in Supabase SQL editor
└── .github/
    ├── workflows/ci.yml              # Type-check + lint on every PR
    └── ISSUE_TEMPLATE/               # Bug, feature, good-first-issue templates
```

---

## Getting Started

Full setup guide with troubleshooting: **[DEVELOPMENT.md](./DEVELOPMENT.md)**

### Quick start

### 1. Clone

```bash
git clone https://github.com/Priyanshu-byte-coder/devtrack.git
cd devtrack
npm install
```

### 2. Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. **SQL Editor → New Query** — paste and run `supabase/schema.sql`
3. **Project Settings → API** — copy Project URL, anon key, service_role key

### 3. GitHub OAuth App

1. [Create an OAuth App](https://github.com/settings/applications/new)
2. Callback URL: `http://localhost:3000/api/auth/callback/github`
3. Copy Client ID and Client Secret

### 4. Environment

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=run_openssl_rand_base64_32

GITHUB_ID=your_client_id
GITHUB_SECRET=your_client_secret
GITHUB_WEBHOOK_SECRET=your_random_webhook_secret
```

### 5. Run

```bash
npm run dev
```

Visit `http://localhost:3000`.

### GitHub Webhook Refresh

DevTrack can accept GitHub push webhooks at `/api/webhooks/github` to mark a user's metrics for refresh as soon as new commits land.

1. Generate `GITHUB_WEBHOOK_SECRET` and add it to your deployment environment.
2. In the GitHub repository, open **Settings -> Webhooks -> Add webhook**.
3. Set the payload URL to `{NEXTAUTH_URL}/api/webhooks/github`.
4. Set content type to `application/json`, paste the same secret, and select the **Push** event.

Webhook requests are verified with GitHub's `X-Hub-Signature-256` HMAC header before DevTrack touches user metrics.

---

## Contributing

DevTrack actively welcomes contributors of all skill levels, including GSSoC 2025 participants.

**Setup takes under 10 minutes** — see [DEVELOPMENT.md](./DEVELOPMENT.md) for the full walkthrough including common errors.

### Quick steps

1. Browse [open issues](../../issues) — start with `good first issue` label
2. Comment on the issue to get assigned before starting work
3. Fork → branch (`feat/issue-42-description`) → PR against `main`
4. Run `npm run lint && npm run type-check` before pushing

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for full guidelines, commit style, and review process.

---

## Roadmap

### Done
- [x] GitHub OAuth sign-in
- [x] Contribution bar chart
- [x] PR analytics widget
- [x] Weekly goal tracker
- [x] Dashboard auth guard
- [x] User avatar in header
- [x] Commit streak tracker
- [x] Top repositories widget
- [x] Time range selector on contribution chart

### Open for contribution
- [ ] Dark mode toggle ([#1](../../issues/1))
- [ ] Responsive mobile layout ([#14](../../issues/14))
- [ ] Create Goal form UI ([#13](../../issues/13))
- [ ] Chart type toggle — bar/line ([#17](../../issues/17))
- [ ] Streak milestone badges ([#31](../../issues/31))
- [ ] Repo filter on contribution chart ([#35](../../issues/35))
- [ ] Improve landing page — feature showcase ([#36](../../issues/36))
- [ ] Language breakdown widget ([#32](../../issues/32))
- [ ] Activity feed ([#33](../../issues/33))
- [ ] Auto-progress goals from commits ([#34](../../issues/34))
- [ ] Streak freeze feature ([#37](../../issues/37))
- [ ] User profile/settings page ([#15](../../issues/15))
- [ ] Export metrics to CSV/PDF ([#16](../../issues/16))
- [ ] Contribution heatmap calendar ([#18](../../issues/18))
- [ ] GitLab integration ([#6](../../issues/6))
- [ ] Slack/Discord weekly digest ([#20](../../issues/20))

---

## License

MIT — see [LICENSE](./LICENSE).
