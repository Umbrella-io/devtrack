# DevTrack Self-Hosting Guide

DevTrack is designed to be easily self-hostable. Since it uses Next.js and Supabase, you can deploy the web app anywhere Node.js or Docker runs, and you can point it to a free Supabase cloud database.

Choose your preferred deployment method below:

- [Method 1: Docker (Recommended)](#1-docker-recommended)
- [Method 2: Railway](#2-railway)
- [Method 3: Render](#3-render)

---

## 🔑 Prerequisites & Environment Variables

Before deploying, you need to set up two external services: **Supabase** (Database) and **GitHub** (Authentication).

### 1. Database Setup (Supabase)
DevTrack uses `@supabase/supabase-js` which relies on the Supabase REST API, so a standard raw PostgreSQL container won't work out of the box. The easiest path is to use Supabase Cloud:
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **SQL Editor -> New Query**, paste the contents of `supabase/schema.sql` from this repository, and run it.
3. Go to **Project Settings -> API** to get your URL and Keys.

### 2. GitHub OAuth App Setup
1. Go to [GitHub Developer Settings -> OAuth Apps](https://github.com/settings/applications/new).
2. Set the **Homepage URL** to your deployment URL (e.g., `https://devtrack.my-domain.com`).
3. Set the **Authorization callback URL** to `<YOUR_URL>/api/auth/callback/github`.
4. Generate a new Client Secret and save both the Client ID and Client Secret.

### Environment Variables Reference

| Variable | Required? | Description | Example |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase Project URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase `anon` public key | `eyJhbG...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase `service_role` secret key | `eyJhbG...` |
| `NEXTAUTH_URL` | Yes | The canonical URL of your deployed app | `https://devtrack.my-domain.com` |
| `NEXTAUTH_SECRET` | Yes | A random 32-character string | Run `openssl rand -base64 32` |
| `GITHUB_ID` | Yes | GitHub OAuth Client ID | `Ov23...` |
| `GITHUB_SECRET` | Yes | GitHub OAuth Client Secret | `458e...` |
| `ENCRYPTION_KEY` | Yes | A random 64-character hex string | Run `openssl rand -hex 32` |
| `GITHUB_TOKEN` | Optional | GitHub Personal Access Token (increases API limits) | `ghp_...` |

---

## 1. Docker (Recommended)

DevTrack provides a production-ready `Dockerfile` and `docker-compose.yml`.

1. Clone the repository and navigate into it:
   ```bash
   git clone https://github.com/Priyanshu-byte-coder/devtrack.git
   cd devtrack
   ```
2. Copy the `.env.example` file to `.env` and fill in the required variables (see the table above).
   ```bash
   cp .env.example .env
   ```
3. Start the container:
   ```bash
   docker compose up -d
   ```
4. DevTrack will be available at `http://localhost:3000`.

---

## 2. Railway

Railway is a modern PaaS that can deploy DevTrack directly from a GitHub repository.

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https%3A%2F%2Fgithub.com%2FPriyanshu-byte-coder%2Fdevtrack)

### Manual Setup
1. Click **New Project -> Deploy from GitHub repo** and select your fork of DevTrack.
2. Railway will detect the Node.js environment automatically.
3. Go to the **Variables** tab and add all the required Environment Variables from the table above.
4. Click **Deploy**.
5. Once deployed, go to the **Settings** tab and generate a custom domain to get your `NEXTAUTH_URL`. Don't forget to update your GitHub OAuth app's callback URL to match!

---

## 3. Render

DevTrack includes a `render.yaml` Blueprint for easy deployment on Render's free tier.

1. Create a free account on [Render](https://render.com/).
2. In the Render Dashboard, click **New + -> Blueprint**.
3. Connect your GitHub account and select your fork of DevTrack.
4. Render will automatically detect the `render.yaml` configuration and prompt you to fill in the required environment variables.
   *Note: `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` will be automatically generated for you.*
5. Click **Apply**. Render will build and deploy your app.
6. Once live, update your `NEXTAUTH_URL` environment variable to match your Render `.onrender.com` domain, and update your GitHub OAuth settings accordingly.

---

## 🔧 Troubleshooting

- **Server Error 500 on Login**: 
  Make sure your `NEXTAUTH_SECRET` and `ENCRYPTION_KEY` are set. If `ENCRYPTION_KEY` is missing or the wrong length (must be 32 bytes/64 hex chars), the OAuth callback will crash when attempting to encrypt the GitHub token.
- **Login Redirects back to Home Page infinitely**: 
  Ensure your `NEXTAUTH_URL` exactly matches your deployment URL (including `https://` and no trailing slash). 
- **Database Fetch Errors**: 
  Make sure you ran the `supabase/schema.sql` file in your Supabase SQL editor. Without the `users` and `goals` tables, the dashboard will fail to load.


### Docker Compose Environment Variables
- Set NODE_ENV to production inside host configs.
