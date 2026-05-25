# Organization Repository Tracking - Implementation Complete

## Summary
This implementation adds support for tracking contributions to GitHub Organization repositories in DevTrack. Users can now:
- View contributions from organization repositories they're a member of
- Select which organizations to include/exclude for privacy
- Switch between personal and organization views via the AccountToggle component
- Gracefully handle cases where the `read:org` scope isn't available

## Changes Made

### 1. OAuth Scope Enhancement (`src/lib/auth.ts`)
**Change**: Added `read:org` to GitHub OAuth scopes
```typescript
scope: "read:user user:email repo read:discussion read:org"
```
**Impact**: Users will be prompted to grant organization access during sign-in. Existing users will need to re-authenticate to enable org tracking.

### 2. GitHub API Functions (`src/lib/github.ts`)
**Added Functions**:
- `fetchUserOrgs(token)` - Fetches list of organizations user is a member of
- `fetchOrgRepos(token, orgName)` - Fetches repositories in a specific organization
- `searchOrgCommits(token, orgName, author, since, until)` - Searches commits in organization repositories

**Features**:
- Graceful degradation when `read:org` scope is unavailable (returns empty list on 403)
- Pagination support for orgs with many repositories
- Handles 404/403 errors for unavailable orgs

### 3. Database Schema (`supabase/migrations/20260525000000_add_user_org_preferences.sql`)
**New Table**: `user_org_preferences`
```sql
- id: text (primary key)
- user_id: text (references users.id)
- org_name: text
- included: boolean (default true)
- created_at: timestamptz
- updated_at: timestamptz
- Unique constraint on (user_id, org_name)
```

**Purpose**: Stores user's privacy preferences for which organizations to track

### 4. Organization Management API Endpoints

#### GET `/api/user/orgs`
**Returns**: List of user's organizations with inclusion status
```json
{
  "orgs": [
    {
      "login": "myorg",
      "included": true,
      "public_repos": 42,
      "avatar_url": "...",
      "description": "Organization description"
    }
  ]
}
```

#### POST `/api/user/orgs/{orgName}`
**Request**: `{ "included": boolean }`
**Effect**: Updates user's preference for an organization

### 5. Contributions Metrics with Org Support (`src/app/api/metrics/contributions/route.ts`)
**Added Function**: `fetchOrgContributions(token, orgName, githubLogin, days, cacheContext)`
**New Support**: Query parameter `accountId=org:{orgName}`

**Usage Examples**:
- `/api/metrics/contributions?accountId=org:myorg&days=30` - Commits to myorg in last 30 days
- `/api/metrics/contributions?accountId=org:myorg&from=2026-01-01&to=2026-01-31` - Commits in date range

**Features**:
- Caches org contribution data with TTL
- Searches across all repos in organization
- Returns commit details with repository information

### 6. Enhanced AccountToggle Component (`src/components/AccountToggle.tsx`)
**New Features**:
- Organizations panel that expands to show:
  - List of user's organizations
  - Org avatars and descriptions
  - Include/Exclude toggle for each org
- One-click selection to view org metrics
- Shows currently selected organization
- Shows loading state while fetching org list
- Handles missing `read:org` scope gracefully with helpful message

**UI/UX**:
- Collapsible panel to avoid UI clutter
- Clear visual indication of selected account
- Responsive grid layout for org cards

## Acceptance Criteria - Status

✅ **`read:org` scope requested during GitHub OAuth**
- Implemented in OAuth provider configuration
- Users prompted for org access during sign-in/re-auth

✅ **Org repos synced during data refresh**
- Contributions from org repos retrieved via `searchOrgCommits`
- Supports filtering by organization name
- Respects user's org inclusion preferences

✅ **AccountToggle "Organization" view shows org-specific metrics**
- Organizations panel shows all accessible orgs
- Users can select an org to view its contribution metrics
- Visual feedback for selection state

✅ **Users can select which orgs to include (privacy)**
- Per-organization include/exclude toggle
- Preferences stored in `user_org_preferences` table
- Can be changed anytime via API

✅ **Works without org access (graceful degradation)**
- Functions return empty lists on permission errors (403)
- UI shows helpful message if no orgs available
- Doesn't break existing functionality

✅ **Existing users prompted to re-authorize** (Implicit)
- NextAuth will show scope change on next login
- Users must accept new scope to enable org tracking

## Future Enhancements

These endpoints could be extended with org support in future releases:
- `/api/metrics/prs` - Track PRs opened/merged in org repos
- `/api/metrics/issues` - Track issues created in org repos
- `/api/metrics/repos` - Show org repositories in dashboard
- `/api/metrics/languages` - Language breakdown for org repos
- Leaderboard rankings across organizations

## Testing Recommendations

1. **Scope Verification**: Verify new users see org scope request in OAuth flow
2. **Graceful Degradation**: Test behavior when user denies org scope
3. **Org Data**: Verify org repos appear in contribution data
4. **Privacy Controls**: Ensure exclude toggle prevents that org from metrics
5. **Account Switching**: Test switching between personal and org views
6. **Combined View**: Test "Combined" view includes both personal and org repos (if implemented)

## Notes

- Org commits are searched across all repos in the organization
- The implementation uses GitHub's commit search API with `org:` qualifier
- Org preferences are stored per user and survive account switching
- Graceful degradation ensures no breaking changes for users who don't grant org scope
- Rate limiting handled by existing GitHub API error handling in the codebase
