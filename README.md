<div align="center">

# DevTrack

**Your personal developer productivity command center.**

> Pull your GitHub activity, commit streaks, PR analytics, and coding goals into one clean, self-hostable dashboard — no enterprise plan, no vendor lock-in.

[![CI](https://github.com/Priyanshu-byte-coder/devtrack/actions/workflows/ci.yml/badge.svg)](https://github.com/Priyanshu-byte-coder/devtrack/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![GSSoC 2026](https://img.shields.io/badge/GSSoC-2026-orange.svg)](https://gssoc.girlscript.tech/)
[![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Supabase%20%7C%20TypeScript-blue)](./DEVELOPMENT.md)
[![Good First Issues](https://img.shields.io/github/issues/Priyanshu-byte-coder/devtrack/good%20first%20issue?label=good%20first%20issues&color=7c3aed)](https://github.com/Priyanshu-byte-coder/devtrack/issues?q=label%3A%22good+first+issue%22)
[![Contributors](https://img.shields.io/github/contributors/Priyanshu-byte-coder/devtrack?color=brightgreen)](https://github.com/Priyanshu-byte-coder/devtrack/graphs/contributors)
[![Last Commit](https://img.shields.io/github/last-commit/Priyanshu-byte-coder/devtrack)](https://github.com/Priyanshu-byte-coder/devtrack/commits/main)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/Priyanshu-byte-coder?label=sponsors&color=ea4aaa)](https://github.com/sponsors/Priyanshu-byte-coder)

**[Live Demo](https://devtrack-delta.vercel.app)** · **[Dev Guide](./DEVELOPMENT.md)** · **[Report Bug](https://github.com/Priyanshu-byte-coder/devtrack/issues/new?template=bug_report.md)** · **[Request Feature](https://github.com/Priyanshu-byte-coder/devtrack/issues/new?template=feature_request.md)** · **[Sponsor](https://github.com/sponsors/Priyanshu-byte-coder)**

</div>

---

## Table of Contents

- [Why DevTrack?](#why-devtrack)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Sponsors](#sponsors)
- [License](#license)

---

## Why DevTrack?

Most developers track their work across multiple disconnected tools — GitHub for commits, Jira for tasks, Notion for goals, Slack for standups. None of them give you the full picture.

**DevTrack solves this by:**

- Consolidating GitHub contributions, PR metrics, and streak data in one view
- Helping you set and visualize personal coding goals with progress tracking
- Keeping your data yours — fully self-hostable with zero vendor lock-in
- Deploying in minutes on the free tier of Next.js + Supabase + Vercel

---

## Features

| Feature | Description |
|---|---|
| **GitHub OAuth** | Sign in with GitHub — no separate account needed |
| **Commit Activity Chart** | Visualize daily commit activity with 7d / 14d / 30d / 90d range selector |
| **Commit Streak Tracker** | Current streak, longest streak, and active days |
| **PR Analytics** | Average review time, merge rate, open/closed PR counts |
| **Top Repositories** | Ranked list of most active repos over any time range |
| **Goal Tracker** | Set and track personal coding goals with progress bars |
| **Public Profile** | Shareable public profile page at `/u/[username]` with stats and badges |
| **Repository Spotlight** | Pin up to 3 repositories to showcase on your public profile |
| **GitHub Achievements** | Automatically synced GitHub achievement badges on your public profile |
| **Leaderboard** | Opt-in public leaderboard ranked by streak, commits, and PRs |
| **Discord Integration** | Streak reminders and milestone alerts via Discord webhooks |
| **Wakatime Integration** | Accurate coding time and language usage from Wakatime |
| **Multi-Account Support** | Link and switch between multiple GitHub accounts |
| **Weekly Email Digest** | Optional Monday morning summary of your coding habits |
| **Data Export** | Download all your data in JSON format |
| **AI Weekly Insights** | Groq-powered natural language summary of your weekly activity |
| **Heatmap Themes** | Default and colour-blind-friendly heatmap colour schemes |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Auth | GitHub OAuth via NextAuth.js v4 |
| Database | Supabase (PostgreSQL) with Row Level Security |
| API | Next.js Route Handlers (`/app/api/`) |
| Charts | Recharts |
| AI | Groq API |
| Deployment | Vercel (free tier, auto-deploys from GitHub) |

---

## Project Structure

```
devtrack/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # GitHub OAuth (NextAuth)
│   │   │   ├── metrics/       # Contributions, streak, PRs, repos
│   │   │   ├── goals/         # Goal CRUD
│   │   │   ├── leaderboard/   # Public leaderboard
│   │   │   ├── public/        # Public profile JSON API
│   │   │   └── user/          # Settings, data export, linked accounts
│   │   ├── dashboard/         # Authenticated dashboard
│   │   ├── u/[username]/      # Public profile pages
│   │   └── page.tsx           # Landing page
│   ├── components/            # Reusable UI components
│   └── lib/
│       ├── auth.ts            # NextAuth config
│       ├── supabase.ts        # Supabase admin client (server-side only)
│       ├── public-profile-data.ts  # GitHub API helpers for public profiles
│       └── github-achievements.ts  # Achievement sync logic
├── supabase/
│   └── migrations/            # Versioned schema migrations
├── e2e/                       # Playwright end-to-end tests
├── test/                      # Unit tests
└── .github/
    ├── workflows/ci.yml       # Type-check + lint on every PR
    └── ISSUE_TEMPLATE/        # Bug, feature, good-first-issue templates
```

---

## Getting Started

For local development and contributing, see **[DEVELOPMENT.md](./DEVELOPMENT.md)**.
To deploy your own instance, see the **[Self-Hosting Guide](./docs/self-hosting.md)**.

### Quick Start

**1. Clone and install**

```bash
git clone https://github.com/Priyanshu-byte-coder/devtrack.git
cd devtrack
npm install
```

**2. Set up Supabase**

1. Create a free project at [supabase.com](https://supabase.com)
2. Run all migrations from `supabase/migrations/` in the SQL editor (in order)
3. Copy your Project URL, anon key, and service_role key from **Project Settings → API**

**3. Create a GitHub OAuth App**

1. Go to [GitHub → Settings → Developer Settings → OAuth Apps](https://github.com/settings/applications/new)
2. Set the callback URL to `http://localhost:3000/api/auth/callback/github`
3. Copy your Client ID and Client Secret

**4. Configure environment**

```bash
cp .env.example .env.local
```

### Environment Variables

> [!WARNING]
> Never commit `.env` or `.env.local` to Git. These files are pre-configured in `.gitignore`.

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `NEXTAUTH_URL` | Yes | Base URL of the app (`http://localhost:3000` locally) |
| `NEXTAUTH_SECRET` | Yes | Session encryption key — `openssl rand -base64 32` |
| `GITHUB_ID` | Yes | GitHub OAuth App Client ID |
| `GITHUB_SECRET` | Yes | GitHub OAuth App Client Secret |
| `ENCRYPTION_KEY` | Yes | 32-byte hex key — `openssl rand -hex 32` |
| `GITHUB_TOKEN` | No | Personal Access Token to raise GitHub API rate limits |
| `GITHUB_WEBHOOK_SECRET` | No | Webhook signature validation key |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis endpoint for rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis access token |
| `GROQ_API_KEY` | No | Groq API key for AI weekly insights |
| `NEXT_PUBLIC_APP_URL` | No | Public URL override for generating share links |

**5. Run locally**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with GitHub.

**6. Run tests**

```bash
# Unit tests
npm test

# End-to-end tests (requires Chromium)
npx playwright install --with-deps chromium
npm run test:e2e
```

---

## Roadmap

### Shipped

| Feature | Notes |
|---|---|
| GitHub OAuth sign-in | |
| Commit activity chart | 7d / 14d / 30d / 90d range selector |
| Commit streak tracker | Current, longest, active days |
| PR analytics widget | Review time, merge rate, open/closed counts |
| Top repositories widget | |
| Weekly goal tracker | |
| Dark mode + heatmap themes | Default and colour-blind-friendly |
| Responsive mobile layout | |
| Public profile (`/u/[username]`) | Shareable stats page |
| Repository Spotlight | Pin up to 3 repos on public profile |
| GitHub Achievements sync | Scraped and cached from GitHub profile |
| Public leaderboard | Opt-in, ranked by streak / commits / PRs |
| Discord webhook integration | Streak reminders and milestone alerts |
| Wakatime integration | Coding time and language breakdown |
| Multi-account GitHub linking | Switch accounts on the dashboard |
| Weekly email digest | Opt-in Monday morning summary |
| Data export | Full JSON dump of user data |
| AI weekly insights | Groq-powered natural language summary |
| Streak freeze | Protect streak during planned breaks |
| RSS feed | Atom feed at `/u/[username]/feed.xml` |

### In Progress / Planned

| Feature | Difficulty | Issue |
|---|---|---|
| Contribution heatmap calendar | Intermediate | [#18](https://github.com/Priyanshu-byte-coder/devtrack/issues/18) |
| Chart type toggle (bar / line) | Intermediate | [#17](https://github.com/Priyanshu-byte-coder/devtrack/issues/17) |
| Language breakdown widget | Intermediate | [#32](https://github.com/Priyanshu-byte-coder/devtrack/issues/32) |
| Activity feed | Intermediate | [#33](https://github.com/Priyanshu-byte-coder/devtrack/issues/33) |
| Auto-progress goals from commits | Advanced | [#34](https://github.com/Priyanshu-byte-coder/devtrack/issues/34) |
| GitLab integration | Advanced | [#6](https://github.com/Priyanshu-byte-coder/devtrack/issues/6) |
| Jira integration | Advanced | — |
| Team dashboards | Advanced | — |
| Embeddable stats widgets | Intermediate | — |
| Mobile app (React Native) | Advanced | — |

---

## Contributing

DevTrack actively welcomes contributors of all skill levels, including **GSSoC 2026 participants**.

Setup takes under 10 minutes — see [DEVELOPMENT.md](./DEVELOPMENT.md) for the full walkthrough.

### How to contribute

1. Browse [open issues](https://github.com/Priyanshu-byte-coder/devtrack/issues) — start with `good first issue`
2. Comment on the issue to get assigned before starting work
3. Fork → branch (`feat/issue-42-description`) → PR against `main`
4. Ensure CI passes: `npm run lint && npm run type-check`

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for commit style, branch naming, and the review process.

Questions? Open a [Discussion](https://github.com/Priyanshu-byte-coder/devtrack/discussions).

---

## Sponsors

DevTrack is free and open source. Sponsoring helps cover infrastructure costs and accelerates new features.

| Tier | Amount | Perks |
|---|---|---|
| Coffee | $5 / mo | Your name in this README |
| Backer | $15 / mo | Name + priority response on issues |
| Champion | $50 / mo | Name + logo in README + feature request priority |
| One-time | $10+ | One-time thanks, no recurring commitment |

**[Sponsor DevTrack on GitHub](https://github.com/sponsors/Priyanshu-byte-coder)**

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

<div align="center">

Built by the DevTrack community · [devtrack-delta.vercel.app](https://devtrack-delta.vercel.app)

Star this repo if DevTrack is useful to you.

</div>
