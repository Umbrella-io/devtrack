# Contributing to DevTrack

Thank you for your interest in contributing to DevTrack! Whether you are a GSSoC (GirlScript Summer of Code) participant or a general open-source contributor, we are thrilled to have you.

Please note that this project is released with a Code of Conduct. By participating in this project, you agree to abide by its terms.

---

## ⚡ Quick Start (Setup in < 10 Steps)

### 1. Fork the Repository

Click the **Fork** button at the top-right of the DevTrack repository.

### 2. Clone Your Fork

```bash
git clone https://github.com/<your-username>/devtrack.git
cd devtrack
```

### 3. Configure Upstream Remote

```bash
git remote add upstream https://github.com/Umbrella-io/devtrack.git
```

### 4. Install pnpm

We use **pnpm** for this project. If you don't have it installed:

```bash
npm install -g pnpm
```

### 5. Install Dependencies

```bash
pnpm install
```

### 6. Set Up Environment Variables

Copy the template file:

```bash
cp .env.example .env.local
```

### 7. Configure Keys

Open `.env.local` in your editor and add your development keys (see Environment Variables Guide below).

### 8. Start the Development Server

```bash
pnpm dev
```

### 9. Open the App

Navigate to:

```text
http://localhost:3000
```

---

## 📋 Table of Contents

- Prerequisites
- Local Development Setup
- Verifying Your Setup
- Environment Variables Guide
- Troubleshooting Common Issues
- Code Style & Standards
- Branch Naming Conventions
- Commit Guidelines
- Issue Labels & GSSoC Levels
- Pull Request (PR) Checklist
- Self-Hosting & Deployment

---

## Prerequisites

Before setting up DevTrack locally, make sure you have configured the following:

### Node.js

- Version **20 or higher** is required.

### pnpm

- Version **9 or higher** is required.

### GitHub OAuth App

1. Go to:

   ```
   GitHub Profile → Settings → Developer Settings → OAuth Apps → New OAuth App
   ```

2. Configure:

   **Application Name**

   ```
   DevTrack Dev
   ```

   **Homepage URL**

   ```
   http://localhost:3000
   ```

   **Authorization Callback URL**

   ```
   http://localhost:3000/api/auth/callback/github
   ```

3. Register the application.

4. Copy the **Client ID** and generate a new **Client Secret**.

---

## Local Development Setup

To get a fully functional copy running with authentication and metrics:

### Database Setup (Supabase)

1. Create a free project on Supabase.
2. Retrieve your:
   - Project API URL
   - Anon Key
   - Service Role Key

From:

```
Project Settings → API
```

### Environment Variables

Ensure you have copied `.env.example` to `.env.local` and filled in all required fields.

### Run Development Commands

Install all project dependencies:

```bash
pnpm install
```

Run the Next.js development server:

```bash
pnpm dev
```

---

## ✅ Verifying Your Setup

After completing the steps above, run these checks to confirm everything is working:

```bash
# 1. Check if the dev server is running
curl http://localhost:3000

# 2. Check your environment variables
pnpm run check-env

# 3. Run TypeScript type checking
pnpm run type-check

# 4. Run tests
pnpm run test

# 5. Build the production version
pnpm run build
```

### Browser Verification

1. Go to:

   ```
   http://localhost:3000
   ```

2. Click **Sign in with GitHub**.

3. Complete the GitHub authentication flow.

4. Verify that your DevTrack dashboard loads successfully.

If all steps pass, your development environment is ready! 🎉

---

## Environment Variables Guide

DevTrack relies on a set of environment variables to connect to external APIs and database services.

Copy `.env.example` to `.env.local` and populate the following values:

| Variable | Required | Description |
|-----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Your Supabase public anonymous API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server-side Supabase secret key |
| `NEXTAUTH_URL` | Yes | Base URL where your app runs locally |
| `NEXTAUTH_SECRET` | Yes | Used to sign NextAuth tokens |
| `GITHUB_ID` | Yes | GitHub OAuth Client ID |
| `GITHUB_SECRET` | Yes | GitHub OAuth Client Secret |
| `ENCRYPTION_KEY` | Yes | 32-byte hex key used to encrypt OAuth tokens |
| `GITHUB_WEBHOOK_SECRET` | No | Secret key to verify incoming GitHub webhooks |
| `GITHUB_TOKEN` | No | GitHub PAT used to bypass API rate limits |
| `UPSTASH_REDIS_REST_URL` | No | Upstash Redis URL |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash Redis REST Token |
| `GROQ_API_KEY` | No | Groq API Key for AI insights |

### Generate Secrets

For `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

For `ENCRYPTION_KEY`:

```bash
openssl rand -hex 32
```

## Troubleshooting Common Issues

Here are solutions to the most frequent problems contributors face during setup.

---

### Issue: `pnpm install` fails with permission errors

#### Solution

**macOS/Linux**

Fix npm permissions (recommended) instead of using `sudo`:

```bash
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
export PATH=~/.npm-global/bin:$PATH
```

⚠️ Only use `sudo` as a last resort, as it can cause persistent permission issues.

**Windows**

Run your terminal as Administrator.

---

### Issue: `.env.local` file not found or missing variables

#### Solution

**macOS/Linux (or Git Bash)**

```bash
cp .env.example .env.local
```

**Windows PowerShell**

```powershell
Copy-Item .env.example .env.local
```

Then open `.env.local` in your editor and fill in all required values (see Environment Variables Guide above).

---

### Issue: Supabase connection error

#### Solution

- Verify your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct.
- Check if your Supabase project is active (not paused due to inactivity).
- Ensure Row Level Security (RLS) policies are properly configured for your tables.
- Check that your IP is not blocked by the Supabase firewall.

---

### Issue: GitHub OAuth returns "redirect_uri mismatch"

#### Solution

1. Go to your GitHub OAuth App settings.
2. Ensure the Authorization callback URL is exactly:

```text
http://localhost:3000/api/auth/callback/github
```

3. Make sure `NEXTAUTH_URL` in `.env.local` matches:

```text
http://localhost:3000
```

4. Do not include a trailing slash.
5. If using a different port, update both the callback URL and `NEXTAUTH_URL`.

---

### Issue: Port 3000 already in use

#### Solution

**macOS/Linux**

```bash
lsof -ti:3000 | xargs kill -9
```

**Windows**

```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Or run the application on a different port:

```bash
pnpm dev -- -p 3001
```

---

### Issue: TypeScript errors during build or type-check

#### Solution

Run:

```bash
pnpm run type-check
```

Fix the reported errors, then build again:

```bash
pnpm run build
```

**Common fixes:**

- Add missing types
- Fix import paths
- Update dependencies

---

### Issue: Dependency conflicts after pulling latest changes

#### Solution

**macOS/Linux (or Git Bash)**

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

**Windows PowerShell**

```powershell
Remove-Item -Recurse -Force node_modules, pnpm-lock.yaml
pnpm install
```

---

### Issue: The app loads but metrics/data are missing

#### Solution

- Open browser developer tools (`F12`) and check the Console for API errors.
- Verify your GitHub token (`GITHUB_TOKEN`) has the required permissions (`repo`, `read:user`, etc.).
- Ensure Supabase tables are properly seeded with test data.
- Check that the API routes are correctly configured in `pages/api/` or `app/api/`.

---

### Issue: `NEXTAUTH_SECRET` or `ENCRYPTION_KEY` not set

#### Solution

Generate secure keys using the terminal.

**For `NEXTAUTH_SECRET`**

```bash
openssl rand -base64 32
```

**For `ENCRYPTION_KEY`**

```bash
openssl rand -hex 32
```

Copy the generated values and paste them into your `.env.local` file.

---

### Issue: "Module not found" or "Cannot find module" errors

#### Solution

Ensure all dependencies are installed:

```bash
pnpm install
```

Check that you're running the command from the project root directory.

Try clearing the Next.js cache.

**macOS/Linux (or Git Bash)**

```bash
rm -rf .next
pnpm dev
```

**Windows PowerShell**

```powershell
Remove-Item -Recurse -Force .next
pnpm dev
```

---

## Code Style & Standards

To ensure code readability and maintainability, please adhere to our styling rules.

### Linting & Formatting

We use ESLint and Prettier.

```bash
pnpm run lint
```

### TypeScript Strict Mode

Write clean, strongly typed code.

```bash
pnpm run type-check
```

### Clean Code Guidelines

- Remove all unused imports and variables.
- Delete debugging statements such as `console.log`.
- Remove temporary comments.
- Ensure proper semantic HTML.
- Follow accessibility (a11y) standards.

---

## Branch Naming Conventions

Always create a new branch for your task.

❌ Never push directly to `main`.

### Format

```text
prefix/short-descriptive-name
```

### Prefix Types

| Prefix | Example |
|----------|----------|
| `feat/` | `feat/add-achievements-tab` |
| `fix/` | `fix/oauth-token-expiry` |
| `docs/` | `docs/update-installation-guide` |
| `test/` | `test/visual-regression-setup` |
| `refactor/` | `refactor/api-routes` |

---

## Commit Guidelines

We enforce Conventional Commits to keep our git history clean and understandable.

### Format

```text
type(scope): short, imperative description
```

### Types

- `feat` – New feature
- `fix` – Bug fix
- `docs` – Documentation updates
- `style` – Formatting or styling changes
- `refactor` – Code restructuring
- `test` – Adding or correcting tests
- `chore` – Maintenance tasks

### Examples

```text
feat(auth): integrate github oauth authentication

fix(dashboard): resolve chart container responsive scaling

docs(contributing): document environment variable configuration
```

---

## Issue Labels & GSSoC Levels

For contributors joining through GirlScript Summer of Code (GSSoC), we map issues using levels to indicate complexity and points.

| Label | Level / Difficulty | Points |
|---------|-------------------|---------|
| `gssoc:level1` | Beginner — Simple styling, documentation fixes, minor bugs | 20 |
| `gssoc:level2` | Intermediate — Feature additions, routing changes, basic tests | 35 |
| `gssoc:level3` | Advanced — Complex logic, API integrations, deep layout refactoring | 55 |

### Guidelines

- One Issue at a Time
- Auto-unassignment after 3 days of inactivity
- Link the issue in your PR description

Example:

```text
Closes #45
```

---

## Pull Request (PR) Checklist

Before submitting your PR, verify the following.

### Lockfile Consistency

- Use only `pnpm`
- Do not commit unnecessary `package-lock.json` changes
- Ensure `pnpm-lock.yaml` is clean

### Tests Pass

```bash
pnpm run test
```

### Application Builds Successfully

```bash
pnpm run build
```

### Additional Checks

- No console warnings or errors
- UI changes include screenshots or GIFs
- Commits follow conventional commit standards
- PR description clearly explains the changes

---

## Self-Hosting & Deployment

For guides on self-hosting DevTrack or deploying it manually, please refer to the Self-Hosting Documentation.

---

# 🚀 Thank You!

Thank you for helping make **DevTrack** better!

Happy coding! 🚀

---

# GSSoC Git Commit & Branching Conventions

To maintain a clean and consistent Git history, contributors must follow these standards.

## 🧾 Commit Message Convention

Use the following prefixes:

- `feat` – New feature
- `fix` – Bug fix
- `chore` – Maintenance tasks
- `docs` – Documentation updates
- `refactor` – Code restructuring
- `test` – Adding or updating tests

### Examples

```text
feat(auth): add GitHub OAuth login

fix(ui): resolve navbar alignment issue

docs(contributing): update branching guide

chore: update dependencies
```

---

## 🌿 Branch Naming Convention

### Format

```text
feature/<name>
fix/<name>
docs/<name>
```

### Examples

```text
feature/login-system

fix/header-alignment

docs/readme-update
```

---

## 🔁 PR Guidelines

- Keep PRs small and focused
- One change per PR
- Link the issue

```text
Closes #1944
```

- Ensure all checks pass before submitting

---

## 📌 Best Practices

- Write meaningful commit messages
- Do not mix unrelated changes
- Rebase before pushing if needed