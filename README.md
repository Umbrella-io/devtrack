<div align="center">

# DevTrack

**Your developer productivity command center.**

> Track your GitHub activity, commit streaks, PR analytics, and coding goals in one clean, self-hostable dashboard — no enterprise plan, no vendor lock-in.

[![CI](https://github.com/Priyanshu-byte-coder/devtrack/actions/workflows/ci.yml/badge.svg)](https://github.com/Priyanshu-byte-coder/devtrack/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![GSSoC 2026](https://img.shields.io/badge/GSSoC-2026-orange.svg)](https://gssoc.girlscript.tech/)
[![Stack](https://img.shields.io/badge/stack-Next.js%2016%20%7C%20Supabase%20%7C%20TypeScript-blue)](./DEVELOPMENT.md)
[![Good First Issues](https://img.shields.io/github/issues/Priyanshu-byte-coder/devtrack/good%20first%20issue?label=good%20first%20issues&color=7c3aed)](https://github.com/Priyanshu-byte-coder/devtrack/issues?q=label%3A%22good+first+issue%22)
[![Contributors](https://img.shields.io/github/contributors/Priyanshu-byte-coder/devtrack?color=brightgreen)](https://github.com/Priyanshu-byte-coder/devtrack/graphs/contributors)
[![Last Commit](https://img.shields.io/github/last-commit/Priyanshu-byte-coder/devtrack)](https://github.com/Priyanshu-byte-coder/devtrack/commits/main)
[![GitHub Sponsors](https://img.shields.io/github/sponsors/Priyanshu-byte-coder?label=sponsors&color=ea4aaa)](https://github.com/sponsors/Priyanshu-byte-coder)

**[Live Demo](https://devtrack-delta.vercel.app)** · **[Dev Guide](./DEVELOPMENT.md)** · **[Report Bug](https://github.com/Priyanshu-byte-coder/devtrack/issues/new?template=bug_report.md)** · **[Request Feature](https://github.com/Priyanshu-byte-coder/devtrack/issues/new?template=feature_request.md)** · **[Discussions](https://github.com/Priyanshu-byte-coder/devtrack/discussions)** · **[Sponsor](https://github.com/sponsors/Priyanshu-byte-coder)**

</div>

---

## Demo

<div align="center">

<table>
  <tr>
    <td width="50%" align="center">
      <img src="./public/assets/gifs/dashboard-demo.gif" alt="DevTrack dashboard demo" width="100%" />
      <br />
      <em>Dashboard: streaks, PR analytics, activity heatmap, and goals</em>
    </td>
    <td width="50%" align="center">
      <img src="./public/assets/gifs/feature-hover-demo.gif" alt="DevTrack widget demo" width="100%" />
      <br />
      <em>Interactive widgets: real-time GitHub data in action</em>
    </td>
  </tr>
  <tr>
    <td colspan="2" align="center">
      <img src="./public/assets/gifs/year_wrapped.gif" alt="DevTrack Year Wrapped" width="70%" />
      <br />
      <em>Year Wrapped: your annual coding journey, visualized</em>
    </td>
  </tr>
</table>

</div>

---

## Table of Contents

- [Why DevTrack?](#why-devtrack)
- [Demo](#demo)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Docker Development Setup](#docker-development-setup)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [Community](#community)
- [Sponsors](#sponsors)
- [License](#license)
- [Contributors](#contributors)

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
| **Year Wrapped** | Annual coding journey recap with animated visualizations |
| **Real-time Dashboard** | Live updates via Supabase Realtime with polling fallback |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS |
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

## Architecture

New contributors can start with the [architecture overview](./docs/architecture.md) for Mermaid diagrams covering the Next.js frontend, API routes, Supabase schema, external services, and GitHub activity sync flow.

---

## API Documentation

DevTrack includes a documented REST API.

Documentation resources:

- `docs/api.md` — API usage guide
- `public/openapi.yaml` — OpenAPI 3.1 specification
- `/api-docs` — Interactive Swagger UI

After starting the development server, open:

`http://localhost:3000/api-docs`

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

### E2E Test Suite (Playwright)

DevTrack ships a Playwright-based end-to-end suite covering the full user journey — OAuth sign-in, dashboard rendering, and API correctness. No real credentials needed; all external calls are mocked via `page.route()`.

| Spec file | Coverage |
|-----------|----------|
| `e2e/auth.spec.ts` | Landing page, sign-in button, OAuth redirect, unauthenticated redirects |
| `e2e/dashboard.spec.ts` | All 6 dashboard widgets render after mock login, no console errors |
| `e2e/goals.spec.ts` | Goal create/delete lifecycle with API payload verification |
| `e2e/streak.spec.ts` | Streak values display, freeze button triggers API call |
| `e2e/api.spec.ts` | Auth-gated API routes return 200/401 correctly |

```bash
# Install Playwright browsers (one-time)
npx playwright install --with-deps chromium

# Run the full suite (dev server auto-starts on port 3002)
npm run test:e2e

# Run a single spec
npx playwright test e2e/goals.spec.ts

# Interactive UI runner
npx playwright test --ui
```

The test server is configured in `playwright.config.mjs` and auto-starts on `http://127.0.0.1:3002` with placeholder credentials — no `.env.local` required. E2E tests also run on every PR via `.github/workflows/e2e.yml`.

### Visual Regression Tests

Playwright screenshot assertions cover the landing page, sign-in page, dashboard header, public profile, and 404 page.

```bash
# Run visual regression tests
npx playwright test -c playwright.visual.config.mjs

# Update baselines
npx playwright test -c playwright.visual.config.mjs --update-snapshots
```

Baselines are stored in `tests/snapshots/`. Use the same Linux/Chromium environment as CI to avoid OS-specific rendering differences. The suite uses a `1280x720` viewport and fails at >0.1% pixel difference.

---

## Docker Development Setup

DevTrack includes Docker support for local development, allowing contributors to get started quickly without manually installing dependencies or configuring environments.

### Prerequisites

- Docker Desktop (Windows/macOS) or Docker Engine (Linux)
- Docker Compose v2+

Verify installation:

```bash
docker --version
docker compose version
```

### Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Fill in the required values as described in the Environment Variables section above.

### Start the Application

Build and start the development container:

```bash
docker compose up --build
```

The application will be available at:

```text
http://localhost:3000
```

### Stop the Application

```bash
docker compose down
```

### Hot Reload Support

The project source code is mounted into the container using Docker volumes.

Any changes made to files on your host machine are automatically reflected inside the container, enabling Next.js hot reload during development without rebuilding the image.

### Rebuild After Dependency Changes

If you modify `package.json` or install new dependencies:

```bash
docker compose down
docker compose up --build
```

### Troubleshooting

Remove containers and rebuild from scratch:

```bash
docker compose down -v
docker compose up --build
```

View container logs:

```bash
docker compose logs -f
```

---

## Roadmap

### Shipped

These features are live in the current version.

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
| Year Wrapped | Animated annual coding journey recap |
| Real-time dashboard | Live Supabase Realtime sync with polling fallback |

### In Progress / Planned

Want to contribute? Pick an item below and open an issue or start a PR.

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

> For caching best practices used in this project, see [Caching Guidelines](docs/caching.md).

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

## Community

Have questions, ideas, or want to connect with other contributors?

- **[GitHub Discussions](https://github.com/Priyanshu-byte-coder/devtrack/discussions)** — ask questions, share ideas, show what you've built
- **[Open an Issue](https://github.com/Priyanshu-byte-coder/devtrack/issues/new/choose)** — bug reports, feature requests, and good-first-issues
- **[Email the maintainer](mailto:priyanshu.coder.dev@gmail.com)** — for anything else

All contributors are expected to follow the [Code of Conduct](./CODE_OF_CONDUCT.md).

---

## License

MIT — see [LICENSE](./LICENSE) for details.

---

## Contributors

Thanks to everyone who has helped build DevTrack. Want to join the list? See [CONTRIBUTING.md](./CONTRIBUTING.md) and pick a [good first issue](https://github.com/Priyanshu-byte-coder/devtrack/issues?q=label%3A%22good+first+issue%22).

<div align="center">

<a href="https://github.com/Priyanshu-byte-coder/devtrack/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Priyanshu-byte-coder/devtrack" alt="Contributors" />
</a>

</div>

---

<div align="center">

Built by the DevTrack community · [devtrack-delta.vercel.app](https://devtrack-delta.vercel.app)

Star this repo if DevTrack is useful to you.

</div>
