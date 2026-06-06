# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` branch | ✅ |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Use GitHub's private disclosure system:
👉 **[Report a vulnerability](https://github.com/Priyanshu-byte-coder/devtrack/security/advisories/new)**

This creates an encrypted private thread between you and the maintainer. Your report is never visible to the public until a fix is released.

If the advisory page is unavailable, email **doshipriyanshu3@gmail.com** as a fallback.

Include in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (optional but appreciated)

**Response:** Acknowledgement within 48 hours. Fix timeline communicated within 5 business days.

---

## Scope

**In scope:**
- Authentication bypass or session vulnerabilities
- GitHub OAuth token leakage or revocation gaps
- Cross-user data exposure via caching or shared tokens
- SQL injection or Supabase data exposure
- Server-side request forgery (SSRF) via GitHub API proxy
- Missing security headers enabling clickjacking or content injection
- Rate limit exhaustion on shared server tokens

**Out of scope:**
- Issues requiring physical device access
- Social engineering
- Volumetric DoS on free-tier Vercel/Supabase infrastructure

---

## Points & Recognition (GSSoC)

Security fixes are treated as **`level:critical`** — highest point tier in the GSSoC scoring system. A private advisory serves as the issue record; no public issue is required. Points are awarded on merge based on impact and fix quality.

---

## Coordinated Disclosure

Once a fix ships, a summary is published in [GitHub Security Advisories](https://github.com/Priyanshu-byte-coder/devtrack/security/advisories). Reporters are credited by name unless they request anonymity.

---

## Row Level Security (RLS)

DevTrack uses Supabase with Row Level Security on all user-data tables.

| Table | RLS | Policies |
|-------|-----|---------|
| `users` | ✅ | SELECT, UPDATE own row only |
| `goals` | ✅ | SELECT, INSERT, UPDATE, DELETE own rows only |
| `metric_snapshots` | ✅ | SELECT, INSERT, DELETE own rows only |

- All RLS policies match against `auth.uid()`
- `supabaseAdmin` (service role key) is server-side only, never exposed to clients
- The anon key has no direct table access by default


### GSSoC API Logging Redaction Standards

This section is the canonical reference for **what may and may not appear in logs**
produced by DevTrack's API and background workers. It applies to every code path that
calls `console.*`, `logger.*`, `pino.*`, `winston.*`, or any third-party logging library.

#### What Must NEVER Be Logged

The following are strictly forbidden in any log line at any level (including debug):

| Category | Examples |
|----------|----------|
| **Authentication tokens** | GitHub OAuth tokens, Supabase service-role keys, JWT bearer tokens, session cookies, refresh tokens, API keys |
| **Secrets** | `CLIENT_SECRET`, `RESEND_API_KEY`, `DATABASE_URL` containing credentials, signing keys, webhook secrets |
| **Passwords** | User passwords (plain or hashed), password reset tokens, MFA backup codes, TOTP seeds |
| **Personal Identifiable Information (PII)** | Email addresses (in URLs only — see exception below), full names, phone numbers, government IDs |
| **Request/response bodies in full** | Form payloads that may contain passwords, payment fields, medical info |
| **Cookies and Authorization headers** | `Cookie:`, `Authorization:`, `Set-Cookie:` values |

> **Exception — email addresses in URLs:** the email-as-path-segment pattern (`/api/users/foo@example.com/...`) is allowed in info-level request logs because the email is the path. Do not log the *body* of such requests, only the method and path.

#### What To Log At Each Level

| Level | Use for | Examples |
|-------|---------|----------|
| `error` | Failures requiring attention | `Failed to sync repo data`, `Rate limit hit for user ${userId}` |
| `warn` | Recoverable issues, degraded operation | `Retrying Supabase query (attempt 2/3)`, `Cache miss for key ${nonSensitiveKey}` |
| `info` | Lifecycle events | `User ${userId} signed in via GitHub`, `Background sync started` |
| `debug` | Developer-only diagnostics | `Calling GitHub API: GET /user/repos` (no body) |

#### Redaction Patterns

**Pattern 1: Centralised logger (preferred).**

Use a single `logger` module that wraps the underlying library. The wrapper redacts
sensitive keys before they reach the transport:

```ts
// lib/logger.ts
const REDACT_KEYS = new Set([
  'authorization', 'cookie', 'set-cookie',
  'password', 'token', 'secret', 'apiKey',
  'accessToken', 'refreshToken', 'sessionId',
]);

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (REDACT_KEYS.has(k)) out[k] = '[REDACTED]';
      else out[k] = redact(v);
    }
    return out;
  }
  return value;
}
```

**Pattern 2: Manual redaction at the call site.**

When logging raw objects, copy and strip before passing to the logger:

```ts
logger.info('user.update', {
  userId: user.id,
  email: '[REDACTED]',
  preferences: user.preferences, // safe — no PII
});
```

#### What To Log

- **Correlation IDs** — every request gets a `requestId` (UUID) emitted at start and end
- **User identifiers** — `userId` (internal) or GitHub `login` (public) is safe
- **Resource identifiers** — `repoId`, `goalId`, `metricId` are safe
- **Counts and durations** — `cacheHits=42 durationMs=128` are safe
- **Public profile fields** — `login`, `avatarUrl`, `displayName` (no email) are safe

#### What NOT To Log (Even at Debug)

- Full request bodies (use `body` field for a sanitized summary, not the raw payload)
- Headers (especially `Authorization`, `Cookie`, `Set-Cookie`)
- Stack traces from production users that include secrets in the message
- Raw SQL queries with parameter interpolation (use parameterised queries + log the
  parameters list separately, with secrets redacted)

#### Testing Redaction

Unit tests for the logger should include a fixture per redaction rule. The fixture
should assert that:

1. A `console.log({ authorization: '...' })` call produces output where the
   `authorization` key is `[REDACTED]`.
2. Nested objects with redacted keys at depth 3+ are still redacted.
3. Arrays of objects with redacted keys are redacted in every element.
4. The original object passed to the logger is **not mutated** (the redaction must
   produce a copy).

Example fixture:

```ts
test('redacts authorization header at any depth', () => {
  const input = { req: { headers: { authorization: 'Bearer xyz' } } };
  const out = redact(input) as typeof input;
  expect(out.req.headers.authorization).toBe('[REDACTED]');
  expect(input.req.headers.authorization).toBe('Bearer xyz'); // original intact
});
```

#### Reviewer Checklist

When reviewing a PR that adds or modifies logging code, reviewers should confirm:

- [ ] No new log call introduces a `REDACT_KEYS` member at any depth
- [ ] If a new sensitive field is added to the data model, `REDACT_KEYS` is updated in
  the same PR
- [ ] Error logs include a `requestId` for traceability
- [ ] No `console.log` / `console.error` calls were added (use the centralised `logger`)
- [ ] No secrets or PII appear in commit messages or PR descriptions

#### Out of Scope

- **Client-side logging** (browser console, React component error boundaries) — the
  above applies to server-side logs only. Client logs should never include tokens
  because tokens should never reach the client.
- **Aggregated metrics** sent to analytics (PostHog, etc.) — these are governed by the
  privacy policy, not this document.
- **Audit logs** of administrative actions — these intentionally include the actor's
  identity and are stored separately.

---

### GSSoC Vulnerability Reporting Escalation Guide

#### Reporting Flow
1. **Initial Report**: Open a [Security Advisory](https://github.com/Priyanshu-byte-coder/devtrack/security/advisories/new) for any security vulnerability
2. **Acknowledgment**: Maintainers acknowledge within 48 hours
3. **Assessment**: Issue is triaged as Critical, High, Medium, or Low severity
4. **Fix Timeline**: Critical issues are patched within 72 hours; High within 7 days; Medium within 14 days
5. **Disclosure**: Coordinated public disclosure after fix is deployed

#### Escalation Paths
- **No response in 48h**: Tag `@Priyanshu-byte-coder` on the advisory thread
- **No response in 72h**: Email **doshipriyanshu3@gmail.com** with advisory reference
- **Disagreement on severity**: Request re-assessment with supporting evidence in the advisory thread

#### GSSoC Contributor Responsibilities
- Report security issues privately via Security Advisories (never public issues)
- Include reproduction steps and impact assessment
- Allow maintainers reasonable time to fix before public disclosure
- Follow responsible disclosure practices

#### Types of Issues to Report
- Authentication bypass or session vulnerabilities
- OAuth token leakage or insufficient revocation
- Cross-user data exposure
- SQL injection or database access issues
- SSRF via GitHub API proxy
- Missing security headers
- Rate limit exhaustion vectors

#### Non-Reportable (Out of Scope)
- Physical device access required
- Social engineering attacks
- Volumetric DoS against free-tier infrastructure
