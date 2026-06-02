"use client";

import SectionHeader from "./SectionHeader";
import { useCallback, useEffect, useState, memo, useMemo } from "react";
import { useAccount } from "@/components/AccountContext";
import type { RepoHealthScore } from "@/types/repo-health";
import RepoHealthPanel from "@/components/RepoHealthPanel";
import RepoActivityDrawer from "@/components/RepoActivityDrawer";
import { Search } from "lucide-react";

/* ---------------- TYPES ---------------- */

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

/* ---------------- CONSTANTS ---------------- */

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

/* ---------------- HELPERS ---------------- */

function getLanguageColor(name: string): string {
  return LANGUAGE_COLORS[name] ?? FALLBACK_LANGUAGE_COLOR;
}

function getVisibleLanguages(languages: RepoLanguage[]): RepoLanguage[] {
  const sorted = [...languages].sort((a, b) => b.percentage - a.percentage);

  if (sorted.length <= 3) {
    const total = sorted.reduce((sum, l) => sum + l.percentage, 0);
    const other = Math.round((100 - total) * 10) / 10;

    if (other > 0 && total < 100) {
      return [...sorted, { name: "Other", bytes: 0, percentage: other }];
    }
    return sorted;
  }

  const top = sorted.slice(0, 2);
  const other = Math.round(
    sorted.slice(2).reduce((s, l) => s + l.percentage, 0) * 10
  ) / 10;

  return [...top, { name: "Other", bytes: 0, percentage: other }];
}

/* ---------------- REPO ITEM ---------------- */

const RepoItem = memo(function RepoItem({
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
}: RepoItemProps) {
  const badgeTitle = health
    ? `Commits: ${health.signals.commitFrequency} | PR Merge Rate: ${Math.round(
        health.signals.prMergeRate * 100
      )}% | Avg PR Time: ${Math.round(
        health.signals.avgPrOpenTimeHours
      )}h | Open Issues: ${health.signals.openIssuesCount} | Last Commit: ${
        health.signals.daysSinceLastCommit
      } days ago`
    : undefined;

  const badgeClass =
    health?.grade === "green"
      ? "bg-[var(--success)]/15 text-[var(--success)] border border-[var(--success)]/25"
      : health?.grade === "yellow"
      ? "bg-[var(--warning)]/15 text-[var(--warning)] border border-[var(--warning)]/25"
      : "bg-[var(--destructive)]/15 text-[var(--destructive)] border border-[var(--destructive)]/25";

  const visibleLanguages = repo.languages
    ? getVisibleLanguages(repo.languages)
    : [];

  return (
    <li>
      <div className="flex items-center justify-between text-sm mb-1">
        <div className="flex items-center gap-2 max-w-[60%] sm:max-w-[70%]">
          <button
            type="button"
            onClick={() => onSelectActivity(repo.name)}
            className="truncate font-medium text-[var(--card-foreground)] hover:text-[var(--accent)]"
          >
            <span className="mr-1 text-[var(--muted-foreground)]">
              #{idx + 1}
            </span>
            {shortName}
            {isPinned && (
              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--accent)]/10 text-[var(--accent)]">
                Pinned
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {healthLoading ? (
            <div className="h-5 w-9 bg-[var(--card-muted)] animate-pulse rounded" />
          ) : health ? (
            <button
              onClick={() => onSelectHealth(repo.name)}
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeClass}`}
              title={badgeTitle}
            >
              {health.score}
            </button>
          ) : (
            <span className="text-xs text-[var(--muted-foreground)]">--</span>
          )}

          <span className="text-xs text-[var(--muted-foreground)]">
            {repo.commits} commits
          </span>

          <button
            onClick={() => onTogglePin(repo.name)}
            className="p-1 hover:bg-[var(--card-muted)] rounded"
          >
            📌
          </button>
        </div>
      </div>

      <div className="h-1.5 bg-[var(--control)] rounded-full overflow-hidden">
        <div
          className="h-full bg-[var(--accent)]"
          style={{ width: `${barWidth}%` }}
        />
      </div>

      {visibleLanguages.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1 text-xs">
          {visibleLanguages.map((lang) => (
            <span
              key={lang.name}
              className="px-2 py-0.5 rounded-full border bg-[var(--control)]"
            >
              <span
                className="inline-block w-2 h-2 rounded-full mr-1"
                style={{ backgroundColor: getLanguageColor(lang.name) }}
              />
              {lang.name} {lang.percentage}%
            </span>
          ))}
        </div>
      )}
    </li>
  );
});

RepoItem.displayName = "RepoItem";

/* ---------------- MAIN COMPONENT ---------------- */

export default function TopRepos() {
  const { selectedAccount } = useAccount();

  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  const [searchQuery, setSearchQuery] = useState("");

  const [pinnedRepos, setPinnedRepos] = useState<string[]>([]);
  const [healthScores, setHealthScores] = useState<
    Record<string, RepoHealthScore>
  >({});
  const [healthLoading, setHealthLoading] = useState(true);

  const [activeHealthRepo, setActiveHealthRepo] = useState<string | null>(null);
  const [selectedRepoForActivity, setSelectedRepoForActivity] =
    useState<string | null>(null);

  /* ---------------- FETCH REPOS ---------------- */

  const fetchRepos = useCallback(() => {
    setLoading(true);
    setError(null);

    const accountParam =
      selectedAccount !== null
        ? `&accountId=${encodeURIComponent(selectedAccount)}`
        : "";

    fetch(`/api/metrics/repos?days=${days}${accountParam}`)
      .then((r) => r.json())
      .then((d) => setRepos(d.repos ?? []))
      .catch(() =>
        setError("Failed to load repositories. Please try again.")
      )
      .finally(() => setLoading(false));
  }, [days, selectedAccount]);

  /* ---------------- FETCH HEALTH ---------------- */

  const fetchHealthScores = useCallback(() => {
    setHealthLoading(true);

    const accountParam =
      selectedAccount !== null
        ? `?accountId=${encodeURIComponent(selectedAccount)}`
        : "";

    fetch(
      `/api/metrics/repo-health${accountParam}${
        accountParam ? "&" : "?"
      }days=${days}`
    )
      .then((r) => r.json())
      .then((d) => {
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
    fetchRepos();
    fetchHealthScores();
  }, [fetchRepos, fetchHealthScores]);

  /* ---------------- DERIVED DATA ---------------- */

  const { filteredRepos, maxCommits } = useMemo(() => {
    const sorted = [...repos].sort((a, b) => b.commits - a.commits);

    const filtered = searchQuery
      ? sorted.filter((r) =>
          r.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : sorted;

    return {
      filteredRepos: filtered,
      maxCommits: Math.max(...repos.map((r) => r.commits), 1),
    };
  }, [repos, searchQuery]);

  /* ---------------- UI ---------------- */

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex justify-between mb-4">
        <SectionHeader title={`Top Repositories (${repos.length})`} />

        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value={7}>7d</option>
          <option value={30}>30d</option>
          <option value={90}>90d</option>
        </select>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-2.5 w-4 h-4" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search repos..."
          className="w-full pl-9 pr-3 py-2 border rounded"
        />
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <ul className="space-y-3">
          {filteredRepos.map((repo, idx) => (
            <RepoItem
              key={repo.name}
              repo={repo}
              idx={idx}
              isPinned={pinnedRepos.includes(repo.name)}
              barWidth={(repo.commits / maxCommits) * 100}
              shortName={repo.name.split("/")[1] ?? repo.name}
              health={healthScores[repo.name]}
              healthLoading={healthLoading}
              onSelectActivity={setSelectedRepoForActivity}
              onSelectHealth={setActiveHealthRepo}
              onTogglePin={() => {}}
            />
          ))}
        </ul>
      )}

      {activeHealthRepo && (
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