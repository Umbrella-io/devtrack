#!/bin/bash
set -e

# Backend/Core: take upstream (ours)
git checkout --ours e2e/notifications.spec.js package.json package-lock.json playwright.config.mjs
git checkout --ours src/app/api/local-coding/stats/route.ts src/app/api/metrics/repo-analytics/route.ts src/app/api/stream/route.ts src/app/api/webhooks/github/route.ts
git checkout --ours src/lib/public-profile-data.ts src/lib/supabase.ts
git checkout --ours test/error-utils.test.ts test/formatActivity.test.ts

# Frontend: take PR (theirs)
git checkout --theirs src/app/compare/\[users\]/page.tsx src/app/dashboard/settings/page.tsx src/app/error.tsx src/app/page.tsx
git checkout --theirs src/components/CIAnalytics.tsx src/components/CodingActivityInsightsCard.tsx src/components/ContributionHeatmap.tsx src/components/CustomCursor.tsx src/components/DiscussionsWidget.tsx src/components/ExportButton.tsx src/components/Footer.tsx src/components/GoalTracker.tsx src/components/PRMetrics.tsx src/components/SSEListener.tsx src/components/StreakTracker.tsx src/components/TodayFocusHero.tsx src/components/WeeklySummaryCard.tsx src/components/WidgetErrorBoundary.tsx src/components/repo-analytics/RepoCarousel.tsx
git checkout --theirs src/lib/ci-analytics.ts src/lib/sse.ts test/user-settings-api.test.ts

# Add framer-motion which was in theirs package.json
npm install framer-motion

# For globals.css and LandingPage.tsx, we will do a manual merge keeping PR's visuals but main's CSS variables.
# Actually, I'll just check out theirs for now, and then apply my previous fixes to globals.css and LandingPage.tsx!
git checkout --theirs src/app/globals.css src/components/landing/LandingPage.tsx

