<div align="center">

# 🚀 DevTrack

=
### Dashboard Overview

![DevTrack Dashboard Demo](./public/assets/gifs/dashboard-demo.gif)

### UI Interactions

![DevTrack UI Interactions](./public/assets/gifs/feature-hover-demo.gif)

![CI](https://github.com/Priyanshu-byte-coder/devtrack/actions/workflows/ci.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![GSSoC 2025](https://img.shields.io/badge/GSSoC-2025-orange.svg)
![Tech Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Supabase%20%7C%20TypeScript-blue)
![Good First Issues](https://img.shields.io/github/issues/Priyanshu-byte-coder/devtrack/good%20first%20issue?label=good%20first%20issues&color=7c3aed)

### Your personal developer productivity command center.


> Stop guessing how productive you are. DevTrack pulls your GitHub activity, PR analytics, commit streaks, and coding goals into **one clean, self-hostable dashboard** — no enterprise plan, no vendor lock-in, no noise.

[![CI](https://github.com/Priyanshu-byte-coder/devtrack/actions/workflows/ci.yml/badge.svg)](https://github.com/Priyanshu-byte-coder/devtrack/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![GSSoC 2026](https://img.shields.io/badge/GSSoC-2026-orange.svg)](https://gssoc.girlscript.tech/)
[![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Supabase%20%7C%20TypeScript-blue)](./DEVELOPMENT.md)
[![Good First Issues](https://img.shields.io/github/issues/Priyanshu-byte-coder/devtrack/good%20first%20issue?label=good%20first%20issues&color=7c3aed)](https://github.com/Priyanshu-byte-coder/devtrack/issues?q=label%3A%22good+first+issue%22)
[![Contributors](https://img.shields.io/github/contributors/Priyanshu-byte-coder/devtrack?color=brightgreen)](https://github.com/Priyanshu-byte-coder/devtrack/graphs/contributors)
[![Last Commit](https://img.shields.io/github/last-commit/Priyanshu-byte-coder/devtrack)](https://github.com/Priyanshu-byte-coder/devtrack/commits/main)
[![Open Issues](https://img.shields.io/github/issues/Priyanshu-byte-coder/devtrack)](https://github.com/Priyanshu-byte-coder/devtrack/issues)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/Priyanshu-byte-coder?label=sponsors&color=ea4aaa)](https://github.com/sponsors/Priyanshu-byte-coder)

**[🌐 Live Demo](https://devtrack-delta.vercel.app)** · **[📖 Dev Guide](./DEVELOPMENT.md)** · **[🐛 Report Bug](https://github.com/Priyanshu-byte-coder/devtrack/issues/new?template=bug_report.md)** · **[✨ Request Feature](https://github.com/Priyanshu-byte-coder/devtrack/issues/new?template=feature_request.md)** · **[💖 Sponsor](https://github.com/sponsors/Priyanshu-byte-coder)**

</div>

---

## 📋 Table of Contents

- [Why DevTrack?](#-why-devtrack)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [Sponsors](#-sponsors)
- [License](#-license)

---

## 💡 Why DevTrack?

Most developers track their work across **5+ disconnected tools** — GitHub for commits, Jira for tasks, Notion for goals, Slack for standups. None of them give you the full picture.

**DevTrack solves this by:**

- 📊 **Consolidating** GitHub contributions, PR metrics, and streak data in one view
- 🎯 **Helping you set and visualize** personal coding goals with progress bars
- 🔒 **Keeping your data yours** — fully self-hostable with zero vendor lock-in
- ⚡ **Deploying in minutes** — Next.js + Supabase + Vercel, entirely free tier

Whether you're a solo developer tracking consistency, a student building your portfolio discipline, or a team lead monitoring your own output — DevTrack is built for you.

---

## ✨ Features


  
| Feature                   | Description                                                              |
| ------------------------- | ------------------------------------------------------------------------ |
| **GitHub OAuth**          | Sign in with GitHub — no extra account needed                            |

| Feature | Description |
|---|---|
| **GitHub OAuth** | Sign in with GitHub — no extra account needed |


| Feature                   | Description                                                              |
| ------------------------- | ------------------------------------------------------------------------ |
| **GitHub OAuth**          | Sign in with GitHub — no extra account needed                            |

| **Commit Activity Chart** | Visualize daily commit activity with 7d / 14d / 30d / 90d range selector |
| **Commit Streak Tracker** | Current streak, longest streak, active days — stay consistent            |
| **PR Analytics**          | Average review time, merge rate, open/closed PR count                    |
| **Top Repositories**      | Ranked list of your most active repos over any time range                |
| **Weekly Goal Tracker**   | Set coding goals and track progress with a progress bar UI               |
| **No separate backend**   | Next.js API routes + Supabase, deploy to Vercel for free                 |

---

## 🛠 Tech Stack


| Layer      | Technology                                        |
| ---------- | ------------------------------------------------- |
| Frontend   | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Auth       | GitHub OAuth via NextAuth.js                      |
| Database   | Supabase (PostgreSQL)                             |
| API        | Next.js Route Handlers (`/app/api/`)              |
| Charts     | Recharts                                          |
| Deployment | Vercel (free, auto-deploys from GitHub)           |


| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Auth | GitHub OAuth via NextAuth.js |
| Database | Supabase (PostgreSQL) |
| API | Next.js Route Handlers (`/app/api/`) |
| Charts | Recharts |
| Deployment | Vercel (free, auto-deploys from GitHub) |



---

## 📁 Project Structure

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

## 🚀 Getting Started

For local development and contributing, see the **[DEVELOPMENT.md](./DEVELOPMENT.md)** guide.
To deploy your own production instance, see the **[Self-Hosting Guide](./docs/self-hosting.md)**.

### Quick Start (< 10 minutes)

**1. Clone & install**

```bash
git clone https://github.com/Priyanshu-byte-coder/devtrack.git
cd devtrack
pnpm install
```

**2. Set up Supabase**

1. Create a free project at [supabase.com](https://supabase.com)
2. **SQL Editor → New Query** — paste and run `supabase/schema.sql`
3. **Project Settings → API** — copy Project URL, anon key, service_role key

**3. Create a GitHub OAuth App**

1. Go to [GitHub → Settings → Developer Settings → OAuth Apps](https://github.com/settings/applications/new)
2. Set callback URL to `http://localhost:3000/api/auth/callback/github`
3. Copy your Client ID and Client Secret

**4. Configure environment**

Copy the `.env.example` file to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the environment variables. Below is a detailed description of each variable supported by DevTrack:

### 🔑 Environment Variables Reference

> [!WARNING]
> Never commit `.env` or `.env.local` files to Git. They contain sensitive security credentials. The `.gitignore` file is pre-configured to ignore these files.

| Variable                        | Required | Description                                           | Example / Recommendation                |
| ------------------------------- | -------- | ----------------------------------------------------- | --------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | **Yes**  | Your Supabase project URL                             | `https://your-project.supabase.co`      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes**  | Supabase public API anonymous key                     | `eyJhbGciOiJIUzI1NiIsInR...`            |
| `SUPABASE_SERVICE_ROLE_KEY`     | **Yes**  | Supabase service role key (Never expose client-side)  | `eyJhbGciOiJIUzI1NiIsInR...`            |
| `NEXTAUTH_URL`                  | **Yes**  | Fully qualified base URL of the app                   | `http://localhost:3000` (Local)         |
| `NEXTAUTH_SECRET`               | **Yes**  | NextAuth session encryption key                       | Generate with `openssl rand -base64 32` |
| `GITHUB_ID`                     | **Yes**  | GitHub OAuth Application Client ID                    | Obtain from GitHub Developer Settings   |
| `GITHUB_SECRET`                 | **Yes**  | GitHub OAuth Application Client Secret                | Obtain from GitHub Developer Settings   |
| `ENCRYPTION_KEY`                | **Yes**  | 32-byte hex key for encrypting OAuth tokens           | Generate with `openssl rand -hex 32`    |
| `GITHUB_WEBHOOK_SECRET`         | No       | Real-time metric refresh signature validation key     | Generate with `openssl rand -hex 32`    |
| `GITHUB_TOKEN`                  | No       | Personal Access Token to avoid GitHub API rate limits | Classic or fine-grained GitHub PAT      |
| `UPSTASH_REDIS_REST_URL`        | No       | Upstash Redis REST endpoint for caching               | `https://your-db.upstash.io`            |
| `UPSTASH_REDIS_REST_TOKEN`      | No       | Upstash Redis REST access token                       | Caching credentials from Upstash        |
| `GROQ_API_KEY`                  | No       | Groq API Key to enable AI-powered weekly insights     | `gsk_...` (From console.groq.com)       |

**5. Run locally**

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with GitHub. 🎉

**6. Run E2E tests**

To run the Playwright end-to-end tests locally:

```bash
# Install browsers if you haven't already
npx playwright install --with-deps chromium

# Run the test suite
npm run test:e2e
```

---

## 🗺 Roadmap

### ✅ Completed

- [x] GitHub OAuth sign-in
- [x] Contribution bar chart with range selector
- [x] PR analytics widget
- [x] Weekly goal tracker
- [x] Dashboard auth guard
- [x] User avatar in header
- [x] Commit streak tracker
- [x] Top repositories widget

### 🔨 Open for Contribution

> New to open source? Issues marked **`good first issue`** are a great place to start!

| Issue                                                             | Feature                          | Difficulty      |
| ----------------------------------------------------------------- | -------------------------------- | --------------- |
| [#1](https://github.com/Priyanshu-byte-coder/devtrack/issues/1)   | Dark mode toggle                 | 🟢 Beginner     |
| [#14](https://github.com/Priyanshu-byte-coder/devtrack/issues/14) | Responsive mobile layout         | 🟢 Beginner     |
| [#13](https://github.com/Priyanshu-byte-coder/devtrack/issues/13) | Create Goal form UI              | 🟢 Beginner     |
| [#17](https://github.com/Priyanshu-byte-coder/devtrack/issues/17) | Chart type toggle (bar/line)     | 🟡 Intermediate |
| [#18](https://github.com/Priyanshu-byte-coder/devtrack/issues/18) | Contribution heatmap calendar    | 🟡 Intermediate |
| [#32](https://github.com/Priyanshu-byte-coder/devtrack/issues/32) | Language breakdown widget        | 🟡 Intermediate |
| [#33](https://github.com/Priyanshu-byte-coder/devtrack/issues/33) | Activity feed                    | 🟡 Intermediate |
| [#34](https://github.com/Priyanshu-byte-coder/devtrack/issues/34) | Auto-progress goals from commits | 🔴 Advanced     |
| [#6](https://github.com/Priyanshu-byte-coder/devtrack/issues/6)   | GitLab integration               | 🔴 Advanced     |
| [#20](https://github.com/Priyanshu-byte-coder/devtrack/issues/20) | Slack/Discord weekly digest      | 🔴 Advanced     |

### 🔭 Future Vision

- Multi-platform integration (GitLab, Bitbucket)
- Team dashboards with aggregated metrics
- AI-generated weekly productivity summaries
- Public profile/shareable stats cards

---

## 🤝 Contributing

DevTrack actively welcomes contributors of all skill levels, including **GSSoC 2026 participants**.

**Setup takes under 10 minutes** — see [DEVELOPMENT.md](./DEVELOPMENT.md) for the full walkthrough, including common errors and their fixes.

### Steps to contribute

1. **Browse** [open issues](https://github.com/Priyanshu-byte-coder/devtrack/issues) — start with the `good first issue` label
2. **Comment** on the issue to get assigned before you start work
3. **Fork → branch** (`feat/issue-42-description`) → **PR against `main`**
4. **Check CI passes**: `pnpm run lint && pnpm run type-check`

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for full guidelines, commit style, and the review process.

> 💬 Questions? Open a [Discussion](https://github.com/Priyanshu-byte-coder/devtrack/discussions) — we're happy to help!

---

## 💖 Sponsors

DevTrack is free and open source. Sponsoring helps cover infrastructure costs (Supabase, Vercel, API usage) and lets me dedicate more time to new features.

| Tier | Amount | Perks |
|------|--------|-------|
| ☕ Coffee | $5 / mo | Your name in this README |
| 🎯 Backer | $15 / mo | Name + priority response on issues |
| 🏆 Champion | $50 / mo | Name + logo in README + feature request priority |
| 💝 One-time | $10+ | One-time thanks, no recurring commitment |

**[→ Sponsor DevTrack on GitHub](https://github.com/sponsors/Priyanshu-byte-coder)**

---

## 📄 License


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

MIT — see [LICENSE](./LICENSE) for details.


---

<div align="center">

Built with ❤️ by the DevTrack community · [devtrack-delta.vercel.app](https://devtrack-delta.vercel.app)

⭐ **Star this repo** if DevTrack helps you — it means a lot!

</div>
