import React from 'react';

const MockSkeleton = ({ title }: { title: string }) => (
  <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
    <h2 className="text-lg font-semibold">{title}</h2>
    <p className="text-sm text-muted-foreground mt-2">Component loading placeholder...</p>
  </div>
);

export const StreakTracker = () => <MockSkeleton title="Streak Tracker" />;
export const RepoAnalyticsExplorer = () => <MockSkeleton title="Repo Analytics Explorer" />;
export const PinnedReposWidget = () => <MockSkeleton title="Pinned Repos Widget" />;
export const TopRepos = () => <MockSkeleton title="Top Repos" />;
export const InactiveRepositoriesCard = () => <MockSkeleton title="Inactive Repositories" />;
export const CodingActivityInsightsCard = () => <MockSkeleton title="Coding Activity Insights" />;
export const ActivityRingChart = () => <MockSkeleton title="Activity Ring Chart" />;
export const ContributionGraph = () => <MockSkeleton title="Contribution Graph" />;
export const ContributionHeatmap = () => <MockSkeleton title="Contribution Heatmap" />;
export const PRMetrics = () => <MockSkeleton title="PR Metrics" />;
export const PRBreakdownChart = () => <MockSkeleton title="PR Breakdown Chart" />;
export const CommitTimeChart = () => <MockSkeleton title="Commit Time Chart" />;
export const PRReviewTrendChart = () => <MockSkeleton title="PR Review Trend Chart" />;