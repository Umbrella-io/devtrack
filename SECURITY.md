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
- Never log authorization tokens or passwords.
- Redact sensitive data before production logs persist.

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
