# Contributing to DevTrack

Thanks for your interest in contributing! This guide will get you from zero to a merged PR.

> ⭐ If DevTrack has been useful to you, consider [starring the repo](https://github.com/Priyanshu-byte-coder/devtrack) — it helps the project grow and reach more developers.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Find an Issue](#how-to-find-an-issue)
- [Setting Up Locally](#setting-up-locally)
- [Making Changes](#making-changes)
- [Submitting a PR](#submitting-a-pr)
- [Review Process](#review-process)
- [Issue Labels](#issue-labels)

---

## Code of Conduct

This project follows the [Contributor Covenant](./CODE_OF_CONDUCT.md). Be respectful.

---

## How to Find an Issue

1. Go to [Issues](../../issues)
2. Filter by label:
   - `good-first-issue` — no prior codebase knowledge needed, well-scoped
   - `medium` — requires reading some existing code
   - `advanced` — architectural changes, requires discussion first
3. Comment "I'd like to work on this" to get assigned
4. **Do not open a PR for an unassigned issue**

First-time contributors: start with `good-first-issue` only.

---

## Setting Up Locally

Full step-by-step guide: **[DEVELOPMENT.md](./DEVELOPMENT.md)**

Short version:

```bash
git clone https://github.com/Priyanshu-byte-coder/devtrack.git
cd devtrack
npm install
cp .env.example .env.local
# fill in .env.local — see DEVELOPMENT.md for exact values
npm run dev
```

Stuck? Check [Common errors](./DEVELOPMENT.md#common-errors) in `DEVELOPMENT.md` first.

---

## Project Structure

Key files:

| Path | Purpose |
|------|---------|
| `src/app/api/metrics/contributions/` | Commit activity from GitHub API |
| `src/app/api/metrics/prs/` | PR analytics from GitHub API |
| `src/app/api/metrics/streak/` | Commit streak calculation |
| `src/app/api/metrics/repos/` | Top repositories by commits |
| `src/app/api/goals/` | Weekly goals CRUD via Supabase |
| `src/lib/auth.ts` | NextAuth config, GitHub OAuth, Supabase user upsert |
| `src/lib/supabase.ts` | Supabase admin client (server-side only) |
| `src/components/` | Dashboard UI components |
| `supabase/schema.sql` | DB schema — run once in Supabase SQL Editor |

See [DEVELOPMENT.md](./DEVELOPMENT.md) for architecture walkthrough and how to add new widgets.

---

## Making Changes

### Branch naming

```
feat/issue-42-add-dark-mode
fix/issue-17-pr-count-off-by-one
docs/update-setup-guide
```

### Commit style (Conventional Commits)

```
feat: add dark mode toggle to dashboard
fix: correct PR merge rate calculation
docs: add Supabase setup troubleshooting
```

### Code style

- TypeScript strict mode — no `any` types
- ESLint + Prettier — run `npm run lint` before pushing
- Components: one file per component, named exports
- API routes: use `getServerSession(authOptions)` for auth checks, never trust client input

---

## Submitting a PR

1. Push your branch to your fork
2. Open a PR against `main`
3. Fill out the PR template completely
4. Link the issue: `Closes #42`
5. Ensure CI passes (lint + type check)

PRs without a linked issue will not be reviewed.

---

## Review Process

- First response within **48 hours**
- Address all review comments before requesting re-review
- After approval, maintainer merges (contributors do not self-merge)

---

## Issue Labels

| Label | Meaning |
|-------|---------|
| `good-first-issue` | Beginner friendly, scoped, documented |
| `medium` | Requires some context, moderate complexity |
| `advanced` | Architectural, discuss in issue before coding |
| `bug` | Something broken |
| `enhancement` | New feature or improvement |
| `docs` | Documentation only |
| `~1h` `~2h` `~4h` `~8h` | Estimated effort |

---

## Questions?

Open a [GitHub Discussion](../../discussions) — don't open an issue for questions.
