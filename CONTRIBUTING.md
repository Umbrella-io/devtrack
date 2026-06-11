# Contributing to DevTrack

Thank you for your interest in contributing to DevTrack! Whether you are a GSSoC (GirlScript Summer of Code) participant or a general open-source contributor, we are thrilled to have you.

Please note that this project is released with a [Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project, you agree to abide by its terms.

---

## ⚡ Quick Start (Setup in < 10 Steps)

1. **Fork the Repo:** Click the "Fork" button at the top-right of the [DevTrack repository](https://github.com/Priyanshu-byte-coder/devtrack).
2. **Clone Your Fork:**
   ```bash
   git clone https://github.com/<your-username>/devtrack.git
   cd devtrack
   ```
3. **Configure Upstream Remote:**
   ```bash
   git remote add upstream https://github.com/Priyanshu-byte-coder/devtrack.git
   ```
4. **Install pnpm (Package Manager):** We use `pnpm` for this project. If you don't have it installed:
   ```bash
   npm install -g pnpm
   ```
5. **Install Dependencies:**
   ```bash
   pnpm install
   ```
6. **Set Up Environment:** Copy the template file:
   ```bash
   cp .env.example .env.local
   ```
7. **Configure Keys:** Open `.env.local` in your editor and add your development keys (see [Environment Variables Guide](#3-environment-variables-guide) below).
8. **Start the Dev Server:**
   ```bash
   pnpm dev
   ```
9. **Open the App:** Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📋 Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Local Development Setup](#2-local-development-setup)
3. [Environment Variables Guide](#3-environment-variables-guide)
4. [Code Style & Standards](#4-code-style--standards)
5. [Branch Naming Conventions](#5-branch-naming-conventions)
6. [Commit Guidelines](#6-commit-guidelines)
7. [Issue Labels & GSSoC Levels](#7-issue-labels--gssoc-levels)
8. [Pull Request (PR) Checklist](#8-pull-request-pr-checklist)
9. [Self-Hosting & Deployment](#9-self-hosting--deployment)

---

## 1. Prerequisites

Before setting up DevTrack locally, make sure you have configured the following:

- **Node.js**: Version `20` or higher is required.
- **pnpm**: Version `9` or higher is required.
- **GitHub OAuth App**:
  1. Go to your GitHub profile → **Settings** → **Developer Settings** → **OAuth Apps** → **New OAuth App**.
  2. Set **Application Name** to `DevTrack Dev`.
  3. Set **Homepage URL** to `http://localhost:3000`.
  4. Set **Authorization callback URL** to `http://localhost:3000/api/auth/callback/github`.
  5. Register the application, then copy the **Client ID** and generate a new **Client Secret**.

---

## 2. Local Development Setup

To get a fully functional copy running with authentication and metrics:

1. **Database Setup (Supabase)**:
   - Create a free project on [Supabase](https://supabase.com).
   - Retrieve your project API URL, anon key, and service role key from **Project Settings** → **API**.
2. **Environment Variables**:
   - Ensure you have copied `.env.example` to `.env.local` and filled in all required fields.
3. **Run Dev Commands**:
   - Install all project dependencies:
     ```bash
     pnpm install
     ```
   - Run the Next.js development server:
     ```bash
     pnpm dev
     ```

---

## 3. Environment Variables Guide

DevTrack relies on a set of environment variables to connect to external APIs and database services. Copy `.env.example` to `.env.local` and populate these values:

| Variable | Required? | Description |
| :--- | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | **Yes** | Your Supabase project URL (e.g., `https://your-ref.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **Yes** | Your Supabase public anonymous API key. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Server-side Supabase secret key (never expose this client-side). |
| `NEXTAUTH_URL` | **Yes** | The base URL where your app is running locally (e.g., `http://localhost:3000`). |
| `NEXTAUTH_SECRET` | **Yes** | Used to sign NextAuth tokens. Generate with: `openssl rand -base64 32`. |
| `GITHUB_ID` | **Yes** | The Client ID from your registered GitHub OAuth Application. |
| `GITHUB_SECRET` | **Yes** | The Client Secret from your registered GitHub OAuth Application. |
| `ENCRYPTION_KEY` | **Yes** | A 32-byte hex key used to encrypt OAuth tokens. Generate with: `openssl rand -hex 32`. |
| `GITHUB_WEBHOOK_SECRET` | No | Secret key to verify incoming GitHub webhooks. Generate with: `openssl rand -hex 32`. |
| `GITHUB_TOKEN` | No | Fine-grained or classic PAT to bypass rate limits when fetching repository metrics. |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis URL for API rate limiting/caching. |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis REST Token. |
| `GROQ_API_KEY` | No | Groq API Key to enable Llama-3 AI insights in the mentor widget. |

---

## 4. Code Style & Standards

To ensure code readability and maintainability, please adhere to our styling rules:

* **Linting & Formatting**: We use ESLint and Prettier. Check your code using:
  ```bash
  pnpm run lint
  ```
* **TypeScript strict mode**: Write clean, strongly typed code. Run type checking before committing:
  ```bash
  pnpm run type-check
  ```
* **Clean Code**:
  - Remove all unused imports and variables.
  - Delete any debugging statements like `console.log` or temporary comments.
  - Ensure proper semantic HTML and accessibility (a11y) standards.

---

## 5. Branch Naming Conventions

Always create a new branch for your task. Never push directly to `main`. Use the following format:

`prefix/short-descriptive-name`

### Prefix Types:
* `feat/` — A new user feature (e.g., `feat/add-achievements-tab`)
* `fix/` — A bug fix (e.g., `fix/oauth-token-expiry`)
* `docs/` — Documentation changes only (e.g., `docs/update-installation-guide`)
* `test/` — Adding or updating tests (e.g., `test/visual-regression-setup`)
* `refactor/` — Code refactoring with no behavior changes (e.g., `refactor/api-routes`)

---

## 6. Commit Guidelines

We enforce **Conventional Commits** to keep our git history clean and understandable.

### Format
```text
<type>(<optional-scope>): <short, imperative description>
```

### Types
* `feat`: New feature
* `fix`: Bug fix
* `docs`: Documentation updates
* `style`: Code style/formatting changes (spaces, semicolons, etc.)
* `refactor`: Refactoring code structure
* `test`: Adding or correcting tests
* `chore`: Maintenance tasks, dependencies, lockfile updates

### Examples
- `feat(auth): integrate github oauth authentication`
- `fix(dashboard): resolve chart container responsive scaling`
- `docs(contributing): document environment variable configuration`

---

## 7. Issue Labels & GSSoC Levels

For contributors joining through GirlScript Summer of Code (GSSoC), we map issues using levels to indicate complexity and points:

| Label | Level / Difficulty | Points |
| :--- | :--- | :---: |
| `gssoc:level1` | **Beginner** — Simple styling, documentation fixes, minor bugs | **20** |
| `gssoc:level2` | **Intermediate** — Feature additions, routing changes, basic tests | **35** |
| `gssoc:level3` | **Advanced** — Complex logic, API integrations, deep layout refactoring | **55** |

### Guidelines:
* **One Issue at a Time**: You can only be assigned to one issue at a time.
* **Auto-unassignment**: If there is no progress or communication on an assigned issue within **3 days**, it will be unassigned and given to another contributor.
* **Link Issue to PR**: Ensure your pull request description explicitly links to your assigned issue (e.g. `Closes #45`).

---

## 8. Pull Request (PR) Checklist

Before submitting your PR, make sure you have verified the following:

- [ ] **Lockfile Consistency**: Only use `pnpm` and do not commit `package-lock.json` changes. Ensure `pnpm-lock.yaml` is clean.
- [ ] **Tests Pass**: Run unit tests and ensure they pass:
  ```bash
  pnpm run test
  ```
- [ ] **Application Builds**: Verify that the production build compiles successfully:
  ```bash
  pnpm run build
  ```
- [ ] **No Console Errors**: Check for console warnings/errors in developer tools.
- [ ] **Visual Validation**: If your changes involve UI edits, include mobile and desktop screenshots or a short demo GIF in the PR description.
- [ ] **Clean History**: Ensure commits are cleanly written and follow conventional formats.

---

## 9. Self-Hosting & Deployment

For guides on self-hosting DevTrack or deploying it manually, please check the [Self-Hosting Documentation](./docs/self-hosting.md).

---

Thank you for helping make DevTrack better! Happy coding! 🚀


### GSSoC Git Commit & Branching Conventions

To maintain a clean and consistent Git history, contributors must follow these standards.

## 🧾 Commit Message Convention

Use prefixes:

- feat: New feature
- fix: Bug fix
- chore: Maintenance tasks (deps, configs, lockfiles)
- docs: Documentation updates
- refactor: Code restructuring without behavior change
- test: Adding or updating tests

### Examples:
- feat(auth): add GitHub OAuth login
- fix(ui): resolve navbar alignment issue
- docs(contributing): update branching guide
- chore: update dependencies

---

## 🌿 Branch Naming Convention

- feature/<name>
- fix/<name>
- docs/<name>

### Examples:
- feature/login-system
- fix/header-alignment
- docs/readme-update

---

## 🔁 PR Guidelines

- Keep PRs small and focused
- One change per PR
- Link issue: Closes #1944
- Ensure all checks pass before submitting

---

## 📌 Best Practices

- Write meaningful commit messages
- Do not mix unrelated changes
- Rebase before push if needed