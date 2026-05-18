# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| `main` branch | ✅ |

## Reporting a Vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Email: **doshipriyanshu3@gmail.com** *(or open a [private security advisory](https://github.com/Priyanshu-byte-coder/devtrack/security/advisories/new))*

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fix (optional)

**Response time:** Acknowledgement within 48 hours. Fix timeline communicated within 5 business days.

## Scope

In scope:
- Authentication bypass or session vulnerabilities
- SQL injection or data exposure via Supabase queries
- GitHub OAuth token leakage
- Server-side request forgery (SSRF) via GitHub API proxy

Out of scope:
- Issues requiring physical access to a device
- Social engineering attacks
- Rate limiting / denial of service on free-tier Vercel/Supabase

## Row Level Security (RLS)

DevTrack uses Supabase with Row Level Security enabled on all tables to ensure users can only access their own data.

### Protected Tables

| Table | RLS Enabled | Policies |
|-------|-------------|----------|
| `users` | ✅ | SELECT, UPDATE own row only |
| `goals` | ✅ | SELECT, INSERT, UPDATE, DELETE own rows only |
| `metric_snapshots` | ✅ | SELECT, INSERT, DELETE own rows only |

### How It Works

- All RLS policies use `auth.uid()` to match against the `id` or `user_id` column
- Users can only read, write, or delete their **own** rows
- `supabaseAdmin` (service role key) bypasses RLS automatically for trusted server-side operations — it is **never** exposed to the client
- The anon key has no access to any table by default

### Migration

RLS policies are defined in:

## Disclosure Policy

Once a fix is released, we will publish a summary in the [GitHub Security Advisories](https://github.com/Priyanshu-byte-coder/devtrack/security/advisories) page. Credit will be given to the reporter unless they prefer to remain anonymous.

To apply locally:
```bash
supabase db push
```

### Security Principle

All client-facing queries use the anon key with RLS enforcement. Server-side API routes use `supabaseAdmin` only when elevated privileges are required (e.g. creating a user on first login).
