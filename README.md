<div align="center">

# DevTrack

**Open-source developer productivity dashboard**

Track GitHub contributions, visualize PR metrics, and build consistent coding habits — all in one self-hostable interface.

[![CI](https://github.com/Priyanshu-byte-coder/devtrack/actions/workflows/ci.yml/badge.svg)](https://github.com/Priyanshu-byte-coder/devtrack/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/Priyanshu-byte-coder/devtrack)](./LICENSE)
[![Stars](https://img.shields.io/github/stars/Priyanshu-byte-coder/devtrack?style=flat)](https://github.com/Priyanshu-byte-coder/devtrack/stargazers)
[![Forks](https://img.shields.io/github/forks/Priyanshu-byte-coder/devtrack?style=flat)](https://github.com/Priyanshu-byte-coder/devtrack/forks)
[![Contributors](https://img.shields.io/github/contributors/Priyanshu-byte-coder/devtrack)](https://github.com/Priyanshu-byte-coder/devtrack/graphs/contributors)
[![Issues](https://img.shields.io/github/issues/Priyanshu-byte-coder/devtrack)](https://github.com/Priyanshu-byte-coder/devtrack/issues)
[![Last Commit](https://img.shields.io/github/last-commit/Priyanshu-byte-coder/devtrack)](https://github.com/Priyanshu-byte-coder/devtrack/commits/main)
[![GSSoC](https://img.shields.io/badge/GSSoC-2026-orange.svg)](https://gssoc.girlscript.tech)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Priyanshu-byte-coder/devtrack)

</div>

---

## Why DevTrack?

Developer metrics live in too many places — GitHub activity, PR turnaround, issue counts, personal goals. DevTrack consolidates everything into a single clean dashboard you can self-host for free. No enterprise pricing, no SaaS lock-in, no third-party data sharing.

---

## Features

- **Contribution Graph** — daily commit activity across all linked accounts with customizable time ranges and chart types
- **PR Analytics** — average review time, merge rate, open/closed counts, and review cycle trends
- **Commit Streak Tracker** — current streak, longest streak, and active day heatmap
- **Top Repositories** — ranked by commit activity with health scores and language breakdown
- **Goal Tracker** — set weekly coding targets and track progress in real time
- **Multi-account support** — connect multiple GitHub accounts and view unified or per-account metrics
- **Public profiles** — shareable developer profile pages with badge embeds
- **Self-hostable** — runs on Vercel + Supabase, both free tiers, no infrastructure to manage

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js](https://nextjs.org) (App Router) + TypeScript |
| Auth | [NextAuth.js](https://next-auth.js.org) — GitHub OAuth |
| Database | [Supabase](https://supabase.com) (PostgreSQL + Row-Level Security) |
| Charts | [Recharts](https://recharts.org) |
| Styling | Tailwind CSS with CSS custom properties |
| Cache | Upstash Redis |
| Deployment | [Vercel](https://vercel.com) |

---

## Quick Start

Full setup guide with environment variable reference and troubleshooting: **[DEVELOPMENT.md](./DEVELOPMENT.md)**

### 1. Clone and install

```bash
git clone https://github.com/Priyanshu-byte-coder/devtrack.git
cd devtrack
npm install
```

### 2. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. **SQL Editor → New Query** — paste and run `supabase/schema.sql`
3. **Project Settings → API** — copy your Project URL and keys

### 3. Create a GitHub OAuth App

1. Go to [GitHub → Settings → Developer Settings → OAuth Apps](https://github.com/settings/applications/new)
2. Set the callback URL to `http://localhost:3000/api/auth/callback/github`
3. Copy the Client ID and Client Secret

### 4. Configure environment

```bash
cp .env.example .env.local
# Fill in all values — see DEVELOPMENT.md for a full reference
```

### 5. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## Deploying to Vercel

Click the button below — Vercel will clone the repo and walk you through environment setup:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Priyanshu-byte-coder/devtrack)

Or follow the manual steps in [DEVELOPMENT.md → Deployment](./DEVELOPMENT.md).

---

## Contributing

DevTrack actively welcomes contributors of all experience levels.

```
Browse issues → Get assigned → Fork → PR
```

- Start with [`good first issue`](https://github.com/Priyanshu-byte-coder/devtrack/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) if you're new to the codebase
- Comment on an issue before starting work — unassigned PRs may be closed
- Run `npm run lint && npm run type-check` before opening a PR
- Read **[CONTRIBUTING.md](./CONTRIBUTING.md)** for commit style, branch naming, and review expectations

All skill levels welcome. **Setup takes under 10 minutes.**

> ⭐ If DevTrack has been useful to you, consider [starring the repo](https://github.com/Priyanshu-byte-coder/devtrack) — it helps the project reach more developers.

---

## Community

| Channel | Purpose |
|---------|---------|
| [GitHub Discussions](https://github.com/Priyanshu-byte-coder/devtrack/discussions) | Questions, ideas, general chat |
| [Issues](https://github.com/Priyanshu-byte-coder/devtrack/issues) | Bug reports and feature requests |
| [Pull Requests](https://github.com/Priyanshu-byte-coder/devtrack/pulls) | Contributions |

---

## Contributors

<a href="https://github.com/Priyanshu-byte-coder/devtrack/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Priyanshu-byte-coder/devtrack" alt="Contributors" />
</a>

---

## License

MIT — see [LICENSE](./LICENSE).
