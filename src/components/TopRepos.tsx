"use client";
import SectionHeader from "./SectionHeader";

import { useCallback, useEffect, useState, memo, useMemo } from "react";
import { useAccount } from "@/components/AccountContext";
import type { RepoHealthScore } from "@/types/repo-health";
import RepoHealthPanel from "@/components/RepoHealthPanel";
import RepoActivityDrawer from "@/components/RepoActivityDrawer";
import { Search } from "lucide-react";

interface RepoItemProps {
  repo: Repo;
  idx: number;
  isPinned: boolean;
  barWidth: number;
  shortName: string;
  health: RepoHealthScore | undefined;
  healthLoading: boolean;
  onSelectActivity: (name: string) => void;
  onSelectHealth: (name: string) => void;
  onTogglePin: (name: string) => void;
}

const RepoItem = memo(({
  repo,
  idx,
  isPinned,
  barWidth,
  shortName,
  health,
  healthLoading,
  onSelectActivity,
  onSelectHealth,
  onTogglePin,
}: RepoItemProps) => {
  const badgeTitle = health
    ? `Commits: ${health.signals.commitFrequency} | PR Merge Rate: ${Math.round(
        health.signals.prMergeRate * 100
      )}% | Avg PR Time: ${Math.round(
        health.signals.avgPrOpenTimeHours
      )}h | Open Issues: ${health.signals.openIssuesCount} | Last Commit: ${health.signals.daysSinceLastCommit} days ago`
    : undefined;

  const badgeClass =
    health?.grade === "green"
      ? "bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/25"
      : health?.grade === "yellow"
        ? "bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/25"
        : "bg-[var(--destructive)]/15 text-[var(--destructive)] border border-[var(--destructive)]/25";

  const visibleLanguages = repo.languages ? getVisibleLanguages(repo.languages) : [];

  return (
    <li>
      <div className="flex items-center justify-between text-sm mb-1">
        <div className="flex items-center gap-2 max-w-[60%] sm:max-w-[70%]">
          <button
            type="button"
            onClick={() => onSelectActivity(repo.name)}
            className="truncate text-[var(--card-foreground)] transition-colors hover:text-[var(--accent)] text-left font-medium"
            title={repo.description || `View activity for ${repo.name}`}
          >
            <span className="mr-1 text-[var(--muted-foreground)] font-normal">#{idx + 1}</span>
            {shortName}
            {isPinned && (
              <span className="ml-2 inline-flex items-center rounded-md bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--accent)_20%,transparent)] align-middle">
                Pinned
              </span>
            )}
          </button>
          <a
            href={repo.url || `https://github.com/${repo.name}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors shrink-0"
            title="Open in GitHub"
            aria-label={`Open ${repo.name} in GitHub`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>
          </a>
        </div>
        <span className="shrink-0 flex items-center gap-2">
          {healthLoading ? (
            <div className="h-5 w-9 rounded bg-[var(--card-muted)] animate-pulse" />
          ) : health ? (
            <button
              type="button"
              onClick={() => onSelectHealth(repo.name)}
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold cursor-pointer ${badgeClass}`}
              title={badgeTitle}
              aria-label={`View health breakdown for ${shortName}`}
            >
              {health.score}
            </button>
          ) : (
            <span
              className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--control)] px-2 py-0.5 text-xs font-semibold text-[var(--muted-foreground)]"
              title="Not enough data to calculate health score"
            >
              --
            </span>
          )}
          <span className="text-[var(--muted-foreground)]">
            {repo.commits} commit{repo.commits !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={() => onTogglePin(repo.name)}
            className="ml-1 p-1 hover:bg-[var(--card-muted)] rounded-md transition-colors"
            title={
              isPinned
                ? `Unpin ${shortName} repository`
                : `Pin ${shortName} repository`
            }
            aria-label={isPinned ? `Unpin ${repo.name}` : `Pin ${repo.name}`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={isPinned ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isPinned ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"}
            >
              <path d="M12 17v5" />
              <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
            </svg>
          </button>
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--control)]">
        <div
          className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <div className="mt-2 min-h-6">
        {visibleLanguages.length > 0 && (
          <div className="flex flex-wrap gap-1.5 text-[11px] text-[var(--muted-foreground)]">
            {visibleLanguages.map((language) => (
              <span
                key={language.name}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--border)] bg-[var(--control)] px-2 py-0.5"
                title={`${language.name}: ${language.percentage}%`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: getLanguageColor(language.name) }}
                />
                <span className="text-[var(--card-foreground)]">{language.name}</span>
                <span>{language.percentage}%</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.repo.name === nextProps.repo.name &&
    prevProps.repo.commits === nextProps.repo.commits &&
    prevProps.idx === nextProps.idx &&
    prevProps.isPinned === nextProps.isPinned &&
    prevProps.barWidth === nextProps.barWidth &&
    prevProps.shortName === nextProps.shortName &&
    prevProps.healthLoading === nextProps.healthLoading &&
    prevProps.health?.score === nextProps.health?.score &&
    prevProps.health?.grade === nextProps.health?.grade
  );
});
RepoItem.displayName = "RepoItem";

interface RepoLanguage {
  name: string;
  bytes: number;
  percentage: number;
}

interface Repo {
  name: string;
  commits: number;
  url: string;
  description: string | null;
  languages?: RepoLanguage[];
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f7df1e",
  Python: "#3572A5",
  Go: "#00ADD8",
  Rust: "#dea584",
  Java: "#b07219",
  CSS: "#563d7c",
  HTML: "#e34c26",
  Ruby: "#701516",
  Shell: "#89e051",
};

const FALLBACK_LANGUAGE_COLOR = "#6b7280";

function getLanguageColor(name: string): string {
  return LANGUAGE_COLORS[name] ?? FALLBACK_LANGUAGE_COLOR;
}

function getVisibleLanguages(languages: RepoLanguage[]): RepoLanguage[] {
  const sorted = [...languages].sort((a, b) => b.percentage - a.percentage);

  if (sorted.length <= 3) {
   const total = sorted.reduce((sum, lang) => sum + lang.percentage, 0);
const otherPercentage = Math.round((100 - total) * 10) / 10;

if (total < 100 && sorted.length > 0 && otherPercentage > 0) {
  return [
    ...sorted,
    {
      name: "Other",
      bytes: 0,
      percentage: otherPercentage,
    },
  ];
}
    return sorted;
  }

  const topLanguages = sorted.slice(0, 2);
  const otherPercentage = Math.round(
    sorted.slice(2).reduce((sum, lang) => sum + lang.percentage, 0) * 10
  ) / 10;

  return [
    ...topLanguages,
    {
      name: "Other",
      bytes: 0,
      percentage: otherPercentage,
    },
  ];
}

export default function TopRepos() {
  const { selectedAccount } = useAccount();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [healthScores, setHealthScores] = useState<Record<string, RepoHealthScore>>({});
  const [healthLoading, setHealthLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<"commits" | "name">("commits");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [pinnedRepos, setPinnedRepos] = useState<string[]>([]);
  const [pinError, setPinError] = useState<string | null>(null);
  const [activeHealthRepo, setActiveHealthRepo] = useState<string | null>(null);
  const [selectedRepoForActivity, setSelectedRepoForActivity] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    fetch("/api/user/settings")
      .then((r) => r.json())
      .then((d) => setPinnedRepos(d.pinned_repos || []))
      .catch((err) => console.error("Failed to load pinned repos", err));
  }, []);

  const togglePin = async (repoFullName: string) => {
    const isPinned = pinnedRepos.includes(repoFullName);
    let newPinsArray: string[];
    
    if (isPinned) {
      newPinsArray = pinnedRepos.filter(name => name !== repoFullName);
    } else {
      if (pinnedRepos.length >= 3) {
        setPinError("Maximum 3 pins allowed");
        return;
      }
      newPinsArray = [...pinnedRepos, repoFullName];
    }
    
    setPinError(null);

    const prevPins = [...pinnedRepos];
    setPinnedRepos(newPinsArray);

    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ pinned_repos: newPinsArray }),
      });
      if (!res.ok) throw new Error("Failed to update pins");
    } catch (err) {
      console.error(err);
      setPinnedRepos(prevPins);
    }
  };

  const fetchRepos = useCallback(() => {
    setLoading(true);
    setError(null);
    setSearchQuery("");
    const accountParam = selectedAccount !== null
      ? `&accountId=${encodeURIComponent(selectedAccount)}`
      : "";
    fetch(`/api/metrics/repos?days=${days}${accountParam}`)
      .then((r) => r.json())
      .then((d: { repos: Repo[] }) => setRepos(d.repos ?? []))
      .catch(() => setError("We couldn't load your top repositories right now. Please try again in a moment."))
      .finally(() => {
        setLoading(false);
        setLastUpdated(new Date());
        setMinutesAgo(0);
      });
  }, [days, selectedAccount]);

  const fetchHealthScores = useCallback(() => {
    setHealthLoading(true);
    const accountParam = selectedAccount !== null
      ? `?accountId=${encodeURIComponent(selectedAccount)}`
      : "";
    fetch(`/api/metrics/repo-health${accountParam}${accountParam ? "&" : "?"}days=${days}`)
      .then((r) => r.json())
      .then((d: { repos: RepoHealthScore[] }) => {
        const map: Record<string, RepoHealthScore> = {};
        for (const item of d.repos ?? []) {
          map[item.repo] = item;
        }
        setHealthScores(map);
      })
      .catch(() => setHealthScores({}))
      .finally(() => setHealthLoading(false));
  }, [days, selectedAccount]);

  useEffect(() => {
    if (!lastUpdated) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - lastUpdated.getTime()) / 60000);
      setMinutesAgo(diff);
    }, 60000);
    return () => clearInterval(interval);
  }, [lastUpdated]);

  useEffect(() => {
    fetchRepos();
    fetchHealthScores();
  }, [fetchRepos, fetchHealthScores, selectedAccount]);

  // toggle sort: same column flips direction, new column resets to desc
  const handleSort = (column: "commits" | "name") => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  // sort and filter repos cached via useMemo to avoid UI thread thrashing
  const { filteredRepos, maxCommits } = useMemo(() => {
    const baseSorted = [...repos].sort((a, b) => {
      if (sortColumn === "name") {
        const nameA = (a.name.split("/")[1] ?? a.name).toLowerCase();
        const nameB = (b.name.split("/")[1] ?? b.name).toLowerCase();
        return sortDirection === "asc"
          ? nameA.localeCompare(nameB)
          : nameB.localeCompare(nameA);
      }
      return sortDirection === "asc"
        ? a.commits - b.commits
        : b.commits - a.commits;
    });

    const sorted = [
      ...pinnedRepos.map(pin => repos.find(r => r.name === pin)).filter(Boolean) as Repo[],
      ...baseSorted.filter(r => !pinnedRepos.includes(r.name))
    ];

    const filtered = searchQuery.trim()
      ? sorted.filter((r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : sorted;

    const max = repos.reduce((m, r) => Math.max(m, r.commits), 1);

    return { filteredRepos: filtered, maxCommits: max };
  }, [repos, sortColumn, sortDirection, pinnedRepos, searchQuery]);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <SectionHeader
    title={`Top Repositories${!loading && repos.length > 0 ? ` (${repos.length})` : ""}`}
  />

          {pinError && (
            <p className="text-xs text-[var(--destructive)]">{pinError}</p>
          )}
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          aria-label="Select time range for top repositories"
          className="rounded-lg border border-[var(--border)] bg-[var(--control)] px-2 py-1 text-sm text-[var(--card-foreground)] focus:outline-none focus:border-[var(--accent)]"
        >
          <option value={7}>Last 7d</option>
          <option value={30}>Last 30d</option>
          <option value={90}>Last 90d</option>
        </select>
      </div>
      {loading ? (
        <div
          role="status"
          aria-live="polite"
          aria-busy="true"
          className="space-y-3"
        >
          <span className="sr-only">Loading top repositories</span>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              aria-hidden="true"
              className="h-10 rounded bg-[var(--card-muted)] animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-[var(--destructive)]/20 bg-[var(--destructive)]/10 p-4 text-sm text-[var(--destructive)]">
          <p>{error}</p>
          <button
            type="button"
            onClick={fetchRepos}
            className="mt-3 rounded-md border border-[var(--destructive)]/30 px-3 py-1.5 text-xs font-medium text-[var(--destructive)] transition-colors hover:bg-[var(--destructive)]/10"
          >
            Try again
          </button>
        </div>
      ) : repos.length === 0 ? (
        <p className="text-sm text-[var(--muted-foreground)]">No commits in the last {days} days.</p>
      ) : (
      <>
      {repos.length > 10 && (
  <div className="relative mb-3">
    <input
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search repositories…"
      aria-label="Search repositories"
      className="w-full rounded-lg border border-[var(--border)] bg-[var(--control)] px-3 py-1.5 pr-10 text-sm text-[var(--card-foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--accent)]"
    />

    {searchQuery.length > 0 && (
      <button
        type="button"
        onClick={() => setSearchQuery("")}
        aria-label="Clear search"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]"
      >
        ✕
      </button>
    )}
  </div>
)}
        <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)] mb-2 px-0">
          <button
            type="button"
            onClick={() => handleSort("name")}
            className="flex items-center gap-1 hover:text-[var(--card-foreground)] transition-colors"
            aria-label="Sort by repository name"
          >
            Repository
            <span aria-hidden="true">
              {sortColumn === "name" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleSort("commits")}
            className="flex items-center gap-1 hover:text-[var(--card-foreground)] transition-colors"
            aria-label="Sort by commit count"
          >
            Commits
            <span aria-hidden="true">
              {sortColumn === "commits" ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
            </span>
          </button>
        </div>
        <div className="relative mb-4">
  <Search className="absolute left-3 top-2.5 h-4 w-4 text-[var(--muted-foreground)]" />
  <input
    type="text"
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    placeholder="Search repositories…"
    className="w-full rounded-lg border border-[var(--border)] bg-[var(--control)] px-9 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
  />
</div>
        <ul className="space-y-3">
          {filteredRepos.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)] py-4 text-center">
              No repos match your search.
            </p>
          ) : filteredRepos.map((repo, idx) => {
            const isPinned = pinnedRepos.includes(repo.name);
            const barWidth = Math.max(
              Math.round((repo.commits / maxCommits) * 100),
              4
            );
            const shortName = repo.name.split("/")[1] ?? repo.name;
            const health = healthScores[repo.name];
            return (
              <RepoItem
                key={repo.name}
                repo={repo}
                idx={idx}
                isPinned={isPinned}
                barWidth={barWidth}
                shortName={shortName}
                health={health}
                healthLoading={healthLoading}
                onSelectActivity={setSelectedRepoForActivity}
                onSelectHealth={setActiveHealthRepo}
                onTogglePin={togglePin}
              />
            );
          })}
        </ul>
      </>
      )}
      {lastUpdated && (
        <p className="text-xs text-[var(--muted-foreground)] mt-2 text-right">
         {minutesAgo === 0 ? "Updated just now" : `Updated ${minutesAgo} min ago`}
        </p>
     )}
      {activeHealthRepo && healthScores[activeHealthRepo] && (
        <RepoHealthPanel
          health={healthScores[activeHealthRepo]}
          isOpen={true}
          onClose={() => setActiveHealthRepo(null)}
        />
      )}
      <RepoActivityDrawer
        repoName={selectedRepoForActivity || ""}
        isOpen={!!selectedRepoForActivity}
        onClose={() => setSelectedRepoForActivity(null)}
      />
    </div>
  );
}
