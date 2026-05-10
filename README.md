# DevTrack

> Open-source developer productivity dashboard — track coding habits, visualize GitHub contribution patterns, and set personal development goals.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![GSSoC 2025](https://img.shields.io/badge/GSSoC-2025-orange.svg)
![Tech Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20Node.js%20%7C%20PostgreSQL-blue)

---

## Problem It Solves

Developer metrics are scattered across GitHub, Jira, Notion, and half a dozen other tools. DevTrack consolidates GitHub activity, PR review times, and issue resolution rates into one clean, self-hostable interface — no enterprise pricing, no vendor lock-in.

---

## Features

- **GitHub OAuth** — sign in with GitHub, no extra account needed
- **Contribution Heatmap** — visualize daily commit activity over time
- **PR Analytics** — average review time, merge rate, open/closed ratio
- **Issue Metrics** — resolution time, label breakdown, assignee stats
- **Goal Tracker** — set weekly coding goals and track progress
- **Team View** — aggregate metrics for small teams (up to 10 members)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Auth | GitHub OAuth 2.0 via NextAuth.js |
| Database | PostgreSQL + Prisma ORM |
| Charts | Recharts |
| Deployment | Vercel (frontend), Railway (backend) |

---

## Project Structure

```
devtrack/
├── client/          # Next.js frontend
│   ├── src/
│   │   ├── app/         # App Router pages
│   │   ├── components/  # Reusable UI components
│   │   └── lib/         # API clients, utilities
│   └── package.json
├── server/          # Express API
│   ├── src/
│   │   ├── routes/      # API route handlers
│   │   ├── controllers/ # Business logic
│   │   ├── middleware/  # Auth, validation
│   │   └── db/          # Prisma schema, migrations
│   └── package.json
├── .github/         # Issue templates, PR template
├── CONTRIBUTING.md
└── CODE_OF_CONDUCT.md
```

---

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL >= 14
- A GitHub OAuth App ([create one here](https://github.com/settings/applications/new))

### 1. Clone the repo

```bash
git clone https://github.com/Priyanshu-byte-coder/devtrack.git
cd devtrack
```

### 2. Set up the backend

```bash
cd server
cp .env.example .env
npm install
```

Edit `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/devtrack
JWT_SECRET=your_jwt_secret
PORT=4000
```

Run migrations and start:

```bash
npm run db:migrate
npm run dev
```

### 3. Set up the frontend

```bash
cd ../client
cp .env.example .env.local
npm install
```

Edit `.env.local`:

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
GITHUB_ID=your_github_client_id
GITHUB_SECRET=your_github_client_secret
```

Start the dev server:

```bash
npm run dev
```

Visit `http://localhost:3000`.

---

## Contributing

DevTrack is actively seeking contributors for GSSoC 2025. All skill levels welcome.

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for full guidelines.

Quick start:

1. Browse [open issues](../../issues) — look for `good-first-issue` or `medium` labels
2. Comment on the issue to get assigned
3. Fork → branch → PR
4. Respond to review feedback within 5 days

**Communication:** GitHub Discussions + Discord (link in Discussions pinned post)

---

## Roadmap

- [ ] GitLab integration
- [ ] Slack/Discord weekly digest notifications
- [ ] VS Code extension for real-time tracking
- [ ] Mobile-responsive redesign
- [ ] CSV/PDF export for metrics

---

## License

MIT — see [LICENSE](./LICENSE).
