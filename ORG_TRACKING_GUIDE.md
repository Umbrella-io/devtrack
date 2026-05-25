# Organization Tracking - Integration Guide

## Quick Setup

### For End Users
1. Sign in to DevTrack (or re-authenticate if already signed in)
2. Accept the new `read:org` scope when prompted
3. Go to Dashboard
4. Click the "Organizations" button in the AccountToggle section
5. You'll see all organizations you're a member of
6. Click on an org name to view its contribution metrics
7. Use Include/Exclude toggles to control which orgs are tracked

### For Developers - Extending to Other Metrics

The architecture supports extending org tracking to any metric endpoint. Here's the pattern:

#### Step 1: Add Query Parameter Support
Update your metric endpoint to handle `accountId=org:{orgName}`:

```typescript
const orgMatch = accountId?.match(/^org:(.+)$/);
if (orgMatch) {
  const orgName = orgMatch[1];
  const result = await fetchOrgMetricData(token, orgName, userId, ...);
  return Response.json(result);
}
```

#### Step 2: Create Org-Specific Fetcher
Add a function to fetch the metric data for an org:

```typescript
async function fetchOrgMetricData(
  token: string,
  orgName: string,
  userId: string,
  days: number,
  cacheContext: { bypass: boolean; userId: string }
): Promise<YourMetricResponse> {
  const key = metricsCacheKey(userId, "your_metric", {
    days,
    org: orgName,
  });

  return withMetricsCache(
    {
      bypass: cacheContext.bypass,
      key,
      ttlSeconds: METRICS_CACHE_TTL_SECONDS.your_metric,
    },
    async () => {
      // Your metric logic here
      // Use org: qualifier in searches when applicable
      // e.g., `org:${orgName} type:pr` for PRs
    }
  );
}
```

#### Step 3: Use Appropriate GitHub API Filters
- **Commits**: Use `searchOrgCommits()` from `lib/github.ts`
- **PRs/Issues**: Use `org:{orgName}` in GitHub Search API queries
- **Repos**: Use `fetchOrgRepos()` from `lib/github.ts`

#### Example: Adding Org Support to PRs Endpoint

```typescript
// In src/app/api/metrics/prs/route.ts

import { searchOrgPRs } from "@/lib/github"; // Add this function to github.ts

// In the GET handler:
if (accountId?.startsWith("org:")) {
  const orgName = accountId.slice(4);
  const result = await fetchOrgPRMetrics(
    session.accessToken,
    orgName,
    days,
    { bypass, userId: session.githubId }
  );
  return Response.json(result);
}
```

## API Reference

### Exported Functions from `lib/github.ts`

```typescript
fetchUserOrgs(token: string): Promise<GitHubOrg[]>
// Returns all orgs user is a member of

fetchOrgRepos(
  token: string, 
  orgName: string, 
  options?: { perPage: number; maxPages: number }
): Promise<GitHubRepo[]>
// Returns paginated list of repos in org

searchOrgCommits(
  token: string,
  orgName: string,
  author: string,
  since?: string,
  until?: string
): Promise<GitHubCommitSearchItem[]>
// Searches commits in org repos
```

## Error Handling

### Missing `read:org` Scope
- GitHub API returns 403
- Catch and return empty data (graceful degradation)
- Don't throw errors to user

### Rate Limiting
- Use the existing `mergeMetrics()` and `pickBestToken()` utilities
- Batch requests when possible
- Leverage caching with `withMetricsCache()`

### Org Not Found
- GitHub returns 404
- Return empty data or 404 response
- Let user know org doesn't exist or they lack access

## Database Queries

### Get User's Included Orgs

```typescript
const { data: preferences } = await supabaseAdmin
  .from("user_org_preferences")
  .select("org_name")
  .eq("user_id", userId)
  .eq("included", true);
```

### Update Org Preference

```typescript
await supabaseAdmin
  .from("user_org_preferences")
  .upsert({
    user_id: userId,
    org_name: orgName,
    included: true,
    updated_at: new Date().toISOString(),
  });
```

## Testing

### Unit Tests
- Test `fetchOrgMetricData` with mocked GitHub API responses
- Test error handling for 403/404 responses
- Test caching behavior

### Integration Tests
- Test with real GitHub org (requires test user with org access)
- Verify metrics match expected values
- Test switching between personal and org views

### E2E Tests
- Test full flow: Sign in → Grant scope → Select org → View metrics
- Test exclude toggle prevents metrics from appearing
- Test switching orgs updates displayed metrics

## Performance Considerations

1. **Caching**: Org metrics are cached with same TTL as personal metrics
2. **Search Limits**: GitHub commit search limited to 1000 results
3. **Pagination**: Org repos paginated to avoid large data transfers
4. **Rate Limits**: Shared rate limit pool with personal metrics

## Security Notes

- All org API calls require authenticated token with `read:org` scope
- Users can only see orgs they have access to (GitHub enforces)
- Org preferences are per-user (no cross-user exposure)
- Database constraints enforce unique (user_id, org_name) pairs

## Troubleshooting

**"No organizations found" message**
- User may not have `read:org` scope
- User may not be a member of any orgs
- Suggest signing out and back in to re-request scopes

**Org metrics not appearing**
- Check if org is marked as "Included"
- Verify user has access to org repos on GitHub
- Check if org name is spelled correctly

**Slow metrics loading**
- GitHub Search API has lower rate limits (~30 req/min for auth)
- Consider batching requests or implementing lower cache TTL
- Look for alternative APIs (GraphQL) for better performance
