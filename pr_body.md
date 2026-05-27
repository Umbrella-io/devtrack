## Summary

This PR implements the per-repository commit heatmap functionality inside the Top Repos widget. Clicking a repository name now opens a drawer with a 90-day mini contribution heatmap and relevant metrics.

Closes #943

## Type of Change

- [ ] Bug fix
- [x] New feature
- [ ] Documentation update
- [ ] Refactor / code cleanup

## Changes Made

- Created `RepoActivityDrawer` component for displaying the per-repo heatmap and metrics (Escape to close, focus-trap logic).
- Created `/api/metrics/repos/[...repo]/commits` API endpoint to fetch up to 100 commits from the last 90 days.
- Updated `TopRepos` widget to make repository names clickable and open the drawer.
- Added a new external link icon next to repo names to preserve the ability to quickly open the repo in GitHub.

## How to Test

Steps for the reviewer to verify this works:

1. Go to the dashboard and ensure the Top Repos widget loads.
2. Click on a repository name.
3. Verify the drawer opens from the right and displays the total commits, most active day, peak hour, and the 90-day mini heatmap correctly.
4. Verify pressing Escape closes the drawer.
5. Click the external link icon to verify it opens the repository on GitHub.

## Screenshots (if UI change)

## Checklist

- [x] Linked issue in summary
- [x] `npm run lint` passes locally
- [x] No TypeScript errors (`npm run type-check`)
- [x] Self-reviewed the diff
- [x] Added/updated tests if applicable
