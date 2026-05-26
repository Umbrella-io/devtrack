export interface WrappedCommit {
  date: string;
  repo: string;
}

export interface WrappedLanguage {
  name: string;
  bytes: number;
  percentage: number;
}

export interface WrappedStats {
  year: number;
  username: string;
  totalCommits: number;
  activeDays: number;
  longestStreak: number;
  mostProductiveMonth: {
    name: string;
    commits: number;
  };
  topLanguages: WrappedLanguage[];
  prsMerged: number;
  mostContributedRepo: {
    name: string;
    commits: number;
  };
  peakCodingHour: {
    hour: number | null;
    label: string;
    commits: number;
  };
  generatedAt: string;
  partial: boolean;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function getYearRange(year: number, now = new Date()) {
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
  const requestedEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59));
  const end = requestedEnd.getTime() > now.getTime() ? now : requestedEnd;

  return {
    start,
    end,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    partial: requestedEnd.getTime() > now.getTime(),
  };
}

export function calculateLongestStreak(contributionsByDate: Record<string, number>) {
  const activeDates = new Set(
    Object.entries(contributionsByDate)
      .filter(([, count]) => count > 0)
      .map(([date]) => date)
  );
  const dates = Array.from(activeDates).sort();
  let longest = 0;
  let current = 0;
  let previous: Date | null = null;

  for (const date of dates) {
    const currentDate = new Date(`${date}T00:00:00Z`);
    const dayDiff =
      previous === null
        ? 1
        : Math.round(
            (currentDate.getTime() - previous.getTime()) / 86400000
          );

    current = dayDiff === 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = currentDate;
  }

  return longest;
}

export function getMostProductiveMonth(contributionsByDate: Record<string, number>) {
  const monthlyTotals = Array.from({ length: 12 }, () => 0);

  for (const [date, count] of Object.entries(contributionsByDate)) {
    const month = Number(date.slice(5, 7)) - 1;
    if (month >= 0 && month < 12) {
      monthlyTotals[month] += count;
    }
  }

  const bestMonth = monthlyTotals.reduce(
    (best, count, index) => (count > monthlyTotals[best] ? index : best),
    0
  );

  return {
    name: MONTH_NAMES[bestMonth],
    commits: monthlyTotals[bestMonth],
  };
}

export function getMostContributedRepo(commits: WrappedCommit[]) {
  const repoCounts: Record<string, number> = {};

  for (const commit of commits) {
    repoCounts[commit.repo] = (repoCounts[commit.repo] ?? 0) + 1;
  }

  const [name = "No repository data", commitsCount = 0] =
    Object.entries(repoCounts).sort((a, b) => b[1] - a[1])[0] ?? [];

  return { name, commits: commitsCount };
}

export function getPeakCodingHour(hours: number[]) {
  const hourCounts = Array.from({ length: 24 }, () => 0);

  for (const hour of hours) {
    if (Number.isInteger(hour) && hour >= 0 && hour <= 23) {
      hourCounts[hour] += 1;
    }
  }

  const bestHour = hourCounts.reduce(
    (best, count, index) => (count > hourCounts[best] ? index : best),
    0
  );
  const commits = hourCounts[bestHour];

  if (commits === 0) {
    return { hour: null, label: "Not enough data yet", commits: 0 };
  }

  return {
    hour: bestHour,
    label: formatHour(bestHour),
    commits,
  };
}

export function calculateLanguagePercentages(
  langTotals: Record<string, number>,
  limit = 3
): WrappedLanguage[] {
  const totalBytes = Object.values(langTotals).reduce(
    (sum, bytes) => sum + bytes,
    0
  );

  return Object.entries(langTotals)
    .map(([name, bytes]) => ({
      name,
      bytes,
      percentage:
        totalBytes > 0 ? Math.round((bytes / totalBytes) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, limit);
}

function formatHour(hour: number) {
  const normalized = hour % 24;
  const suffix = normalized >= 12 ? "pm" : "am";
  const display = normalized % 12 === 0 ? 12 : normalized % 12;
  return `${display}${suffix}`;
}
