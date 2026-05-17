import React, { memo, useMemo } from 'react';
import type { FC } from 'react';

// ─── Type Definitions ───────────────────────────────────────────────────────

export interface Repo {
  name: string;
  url: string;
  owner: string;
  commits?: number;
  maxCommits?: number;
}

export interface TopReposProps {
  repos?: ReadonlyArray<Repo>;
  title?: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const REQUIRED_REPO_FIELDS: readonly (keyof Repo)[] = ['name', 'url', 'owner'];
const ALLOWED_URL_PROTOCOLS: readonly string[] = ['https:', 'http:'];
const MIN_BAR_VALUE = 0;

// ─── Validation ─────────────────────────────────────────────────────────────

/** Returns null if valid, or an error message string if invalid. */
const validateRepo = (repo: unknown, index: number): string | null => {
  if (!repo || typeof repo !== 'object') {
    return `Repository at index ${index} is not an object.`;
  }

  const r = repo as Record<string, unknown>;

  for (const field of REQUIRED_REPO_FIELDS) {
    const value = r[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      return `Repository at index ${index} missing or invalid required field "${field}".`;
    }
  }

  try {
    const parsedUrl = new URL(r.url as string);
    if (!ALLOWED_URL_PROTOCOLS.includes(parsedUrl.protocol)) {
      return `Repository at index ${index} has unsafe protocol "${parsedUrl.protocol}".`;
    }
  } catch {
    return `Repository at index ${index} has an invalid URL.`;
  }

  if (
    r.commits != null &&
    (typeof r.commits !== 'number' || r.commits < MIN_BAR_VALUE)
  ) {
    return `Repository at index ${index} has invalid commits: ${r.commits}.`;
  }

  if (
    r.maxCommits != null &&
    (typeof r.maxCommits !== 'number' || r.maxCommits < MIN_BAR_VALUE)
  ) {
    return `Repository at index ${index} has invalid maxCommits: ${r.maxCommits}.`;
  }

  return null;
};

// ─── Memoized Repo Item ─────────────────────────────────────────────────────

interface RepoItemProps {
  name: string;
  url: string;
  owner: string;
  commits: number;
  maxCommits: number;
}

const RepoItem: FC<RepoItemProps> = memo<RepoItemProps>(
  ({ name, url, owner, commits, maxCommits }) => {
    const barWidth = useMemo(() => {
      if (maxCommits <= 0) return 0;
      return Math.min((commits / maxCommits) * 100, 100);
    }, [commits, maxCommits]);

    return (
      <div className="repo-item">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title={`${owner}/${name}`}
        >
          {owner}/{name}
        </a>
        <span className="commits">{commits} commits</span>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    );
  }
);

RepoItem.displayName = 'RepoItem';

// ─── Main Component ────────────────────────────────────────────────────────

const TopRepos: FC<TopReposProps> = ({ repos = [], title = 'Top Repositories' }) => {
  const validRepos = useMemo(() => {
    const errors: string[] = [];
    const filtered: Repo[] = [];
    for (let i = 0; i < repos.length; i++) {
      const repo = repos[i];
      const error = validateRepo(repo, i);
      if (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(`[TopRepos] ${error}`, repo);
        }
        // Optionally report to monitoring service
      } else {
        filtered.push({
          name: repo.name,
          url: repo.url,
          owner: repo.owner,
          commits: repo.commits ?? 0,
          maxCommits: repo.maxCommits ?? 1,
        });
      }
    }
    return filtered;
  }, [repos]);

  if (validRepos.length === 0) {
    return (
      <section className="top-repos">
        <h2>{title}</h2>
        <p>No repositories to display.</p>
      </section>
    );
  }

  const globalMax = Math.max(...validRepos.map((r) => r.maxCommits));

  return (
    <section className="top-repos">
      <h2>{title}</h2>
      <ul>
        {validRepos.map((repo, index) => (
          <li key={`${repo.owner}/${repo.name}`}>
            <RepoItem
              name={repo.name}
              url={repo.url}
              owner={repo.owner}
              commits={repo.commits}
              maxCommits={globalMax}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};

TopRepos.displayName = 'TopRepos';

export default TopRepos;
