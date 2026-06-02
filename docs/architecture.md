# DevTrack Architecture Overview

This document explains the high-level architecture and data flow of DevTrack.

---

## System Architecture

```mermaid
flowchart TD

    User[User Browser]

    subgraph Frontend
        Pages[Next.js App Router Pages]
        Components[React Components]
    end

    subgraph API
        AuthAPI[/api/auth/]
        MetricsAPI[/api/metrics/]
        GoalsAPI[/api/goals/]
        UserAPI[/api/user/]
    end

    subgraph Database
        DB[(Supabase PostgreSQL)]
    end

    subgraph ExternalServices
        GitHubOAuth[GitHub OAuth]
        GitHubAPI[GitHub API]
        Vercel[Vercel Deployment]
        WakaTime[Optional WakaTime]
    end

    User --> Pages
    Pages --> Components
    Components --> API

    API --> DB
    API --> GitHubAPI
    API --> GitHubOAuth
    API --> WakaTime

    Vercel --> Frontend
```

---

## Frontend Layer

- Built using Next.js App Router
- Uses reusable React components for dashboard widgets
- Tailwind CSS for styling

---

## API Layer

Handles:

- authentication
- GitHub sync
- metrics aggregation
- goals management
- user settings

---

## Database Layer

Supabase PostgreSQL stores:

- users
- goals
- metrics
- streak data
- cached GitHub activity

---

## External Services

### GitHub OAuth

Used for secure authentication.

### GitHub API

Used for:

- commits
- pull requests
- repositories
- contribution activity

### Vercel

Hosts the production deployment.

### WakaTime (optional)

Can provide coding activity metrics.

---

## Data Flow

1. User signs in with GitHub OAuth
2. API fetches GitHub activity
3. Metrics are processed and stored in Supabase
4. Dashboard components fetch and render analytics


### Database Connection Pooling Guide
- Configure pg pool size limits in development to prevent memory spikes.
