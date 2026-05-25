# Contributing to DevTrack

Thank you for your interest in contributing to DevTrack! Whether you are a GSSoC participant or a general open-source contributor, we are thrilled to have you.

Following these guidelines helps ensure a smooth, efficient, and consistent development process for everyone.

---

## Table of Contents

1. [Onboarding & Claiming Issues](#1-onboarding--claiming-issues)
2. [Local Development Setup](#2-local-development-setup)
3. [Branching and Workflow](#3-branching-and-workflow)
4. [Commit Guidelines](#4-commit-guidelines)
5. [Code Style & Standards](#5-code-style--standards)
6. [Pull Request (PR) Checklist](#6-pull-request-pr-checklist)

---

## 1. Onboarding & Claiming Issues

To keep the development queue clean and organized:
* **Claim Before You Build:** Comment on the open issue you want to work on. Wait for a maintainer to assign it to you before writing code.
* **Avoid Duplicates:** Check the active Pull Requests and assigned issues first to ensure someone else is not already working on the same task.
* **Ask Questions:** If an issue's requirements are unclear, comment directly on the issue to seek clarification.

---

## 2. Local Development Setup

To run DevTrack on your machine, follow these steps:

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18 or higher recommended) and npm installed.

### Steps
1. **Fork the Repository:** Click the "Fork" button at the top-right of the [DevTrack repository](https://github.com/Priyanshu-byte-coder/devtrack) to create your own copy.
2. **Clone Your Fork:**
   ```bash
   git clone https://github.com/<your-username>/devtrack.git
   cd devtrack
   ```
3. **Configure Upstream Remote:**
   ```bash
   git remote add upstream https://github.com/Priyanshu-byte-coder/devtrack.git
   ```
4. **Install Dependencies:**
   ```bash
   npm install
   ```
5. **Environment Configuration:**
   * Copy the example environment file:
     ```bash
     cp .env.example .env.local
     ```
   * Open `.env.local` and populate any required configuration values (e.g., Supabase, NextAuth credentials).
6. **Start the Dev Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

---

## 3. Branching and Workflow

Always create a descriptive branch for your changes rather than committing directly to `main`.

### Branch Naming Conventions
Choose a prefix matching the nature of your task:
* **Features:** `feat/<short-description>` (e.g., `feat/add-404-page`)
* **Bug Fixes:** `fix/<short-description>` (e.g., `fix/streak-at-risk-mobile`)
* **Documentation:** `docs/<short-description>` (e.g., `docs/add-contributing-guidelines`)
* **Tests:** `test/<short-description>` (e.g., `test/timezone-parsing`)
* **Refactoring:** `refactor/<short-description>` (e.g., `refactor/webhooks-signature`)

---

## 4. Commit Guidelines

We use **Conventional Commits** to keep our repository history structured, descriptive, and clean.

### Format
```text
<type>(<scope>): <short description>
```

### Types
* `feat`: A new feature
* `fix`: A bug fix
* `docs`: Documentation changes
* `style`: Code style changes (white-space, formatting, missing semi-colons, etc.)
* `refactor`: A code change that neither fixes a bug nor adds a feature
* `test`: Adding missing tests or correcting existing ones
* `chore`: Updating build tasks, package manager configs, etc.

### Examples
* `feat(landing): add custom 404 page for better branding`
* `fix(dashboard): resolve mobile layout stats card overflow`
* `docs(readme): update setup prerequisites in README`

---

## 5. Code Style & Standards

To maintain a professional codebase:
* **Automated Formatting:** We use ESLint and Prettier. Ensure your files are clean before committing:
  ```bash
  npm run lint
  ```
* **No Unused Code:** Remove any unused imports, commented-out dead code blocks, or active `console.log` statements prior to opening a PR.
* **Accessibility (a11y):** Build with semantic HTML elements and include proper ARIA roles and labels for interactive components.

---

## 6. Pull Request (PR) Checklist

Before submitting your PR to the upstream repository, verify the following:

- [ ] **Tests Pass:** All unit/integration tests run and pass without errors (`npx vitest run`).
- [ ] **No Build Errors:** The application builds correctly (`npm run build`).
- [ ] **No Console Errors:** Verify in the browser console that there are no warnings or runtime exceptions.
- [ ] **Descriptive PR Details:** Fill out the PR template completely. Link the issue being closed (e.g., `Closes #123`).
- [ ] **Screenshots Included:** If your change modifies any UI or styling, attach clear mobile and desktop screenshots or a short demo GIF in the PR description.
- [ ] **Clean Git History:** Rebase your branch against the latest upstream `main` to resolve conflicts cleanly.

---

Thank you for contributing to DevTrack! 🚀
