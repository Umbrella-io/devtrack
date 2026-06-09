# DevTrack API Documentation

## Overview

DevTrack provides REST API endpoints for user settings, goals, metrics, notifications, public profiles, badges, integrations, and developer productivity insights.

This document serves as a human-readable guide to the available APIs. For the complete machine-readable specification, refer to the OpenAPI document included in the repository.

---

## Interactive Documentation

DevTrack includes Swagger UI for exploring and testing API endpoints.

After starting the development server, open:

`http://localhost:3000/api-docs`

The complete OpenAPI 3.1 specification is available at:

`public/openapi.yaml`

---

## Authentication

Most user-specific endpoints require authentication through NextAuth session cookies.

Unauthenticated requests typically return:

```json
{
  "error": "Unauthorized"
}
```

with HTTP status `401`.

---

## API Categories

### Authentication

- `/api/auth/link-github`
- `/api/auth/link-github/callback`

### Goals

- `/api/goals`
- `/api/goals/{id}`
- `/api/goals/sync`

### Metrics

- `/api/metrics/activity`
- `/api/metrics/streak`
- `/api/metrics/languages`
- `/api/metrics/issues`
- `/api/metrics/prs`
- `/api/metrics/repo-health`
- `/api/metrics/weekly-summary`
- Additional `/api/metrics/*` endpoints

### Notifications

- `/api/notifications`
- `/api/notifications/{id}`
- `/api/notifications/weekly`

### User Management

- `/api/user/settings`
- `/api/user/github-accounts`
- `/api/user/data-export`

### Public Profiles

- `/api/public/{username}`

### Leaderboard

- `/api/leaderboard`
- `/api/leaderboard/refresh`

### Badges

- `/api/badge/commits`
- `/api/badge/streak-shield`

---

## User Settings

### GET /api/user/settings

Returns settings for the authenticated user.

| Property | Value |
|-----------|---------|
| Method | GET |
| Authentication | Required |
| Description | Returns current user settings |

### Example Response

```json
{
  "timezone": "UTC",
  "publicProfile": true,
  "discordNotifications": false
}
```

### PATCH /api/user/settings

Updates settings for the authenticated user.

| Property | Value |
|-----------|---------|
| Method | PATCH |
| Authentication | Required |
| Description | Updates user settings |

### Example Request

```json
{
  "timezone": "Asia/Kolkata"
}
```

### Example Response

```json
{
  "success": true
}
```

---

## Notifications

### GET /api/notifications

Returns recent notifications for the authenticated user.

| Property | Value |
|-----------|---------|
| Method | GET |
| Authentication | Required |

### Example Response

```json
[
  {
    "id": "123",
    "title": "Weekly Digest",
    "read": false
  }
]
```

### PATCH /api/notifications

Marks notifications as read.

| Property | Value |
|-----------|---------|
| Method | PATCH |
| Authentication | Required |

### Example Response

```json
{
  "success": true
}
```

---

## Goals

### GET /api/goals

Returns goals belonging to the authenticated user.

| Property | Value |
|-----------|---------|
| Method | GET |
| Authentication | Required |

### POST /api/goals

Creates a new goal.

| Property | Value |
|-----------|---------|
| Method | POST |
| Authentication | Required |

### Example Request

```json
{
  "title": "Weekly Commits",
  "target": 20
}
```

### Example Response

```json
{
  "id": "goal_123",
  "title": "Weekly Commits",
  "target": 20
}
```

---

## Leaderboard

### GET /api/leaderboard

Returns leaderboard rankings.

| Property | Value |
|-----------|---------|
| Method | GET |
| Authentication | Not Required |

### Query Parameters

| Parameter | Description |
|------------|-------------|
| lang | Filter rankings by language |
| period | Filter by time period |

### Example

```text
/api/leaderboard?lang=typescript&period=month
```

---

## Metrics

Metrics endpoints provide contributor activity, repository insights, language usage, pull request analytics, streak information, and productivity statistics.

Common metrics routes include:

- `/api/metrics/activity`
- `/api/metrics/streak`
- `/api/metrics/languages`
- `/api/metrics/issues`
- `/api/metrics/prs`
- `/api/metrics/repo-health`
- `/api/metrics/weekly-summary`

Refer to `public/openapi.yaml` or `/api-docs` for complete endpoint definitions and response schemas.

---

## OpenAPI Specification

DevTrack maintains a machine-readable OpenAPI 3.1 specification:

```text
public/openapi.yaml
```

The OpenAPI specification powers the interactive Swagger UI and should remain synchronized with route implementations.

---

## Keeping Documentation Updated

When adding or modifying API routes:

1. Update the route implementation.
2. Update `public/openapi.yaml`.
3. Verify the endpoint appears correctly in `/api-docs`.
4. Update this document if a new API category or major endpoint group is introduced.

Keeping these resources synchronized ensures contributors, self-hosters, and integrators always have accurate API documentation.