
"use client";

import { useState } from "react";
import jsPDF from "jspdf";

interface PRData {
  open: number;
  merged: number;
  avgReviewHours: number;
  mergeRate: string;
}

interface Goal {
  id: string;
  label: string;
  target: number;
  current: number;
}

interface ContributionResponse {
  data: Record<string, number>;
}

interface StreakData {
  current: number;
  longest: number;
  lastCommitDate?: string | null;
  totalActiveDays?: number;
}
interface RepoData {
  name?: string;
  repo?: string;
  commits?: number;
  contributions?: number;
  commitCount?: number;
  description?: string;
}

export default function ExportButton() {
  const [isCopying, setIsCopying] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchData = async () => {
    const fetchOptions: RequestInit = {
      cache: "no-store",
    };

    try {
      const [
        prRes,
        goalsRes,
        contribRes,
        streakRes,
        reposRes,
      ] = await Promise.all([
        fetch("/api/metrics/prs", fetchOptions),
        fetch("/api/goals", fetchOptions),
        fetch("/api/metrics/contributions?days=365", fetchOptions),
        fetch("/api/metrics/streak", fetchOptions),
        fetch("/api/metrics/repos", fetchOptions),
      ]);

      
      const prData: PRData | null = prRes.ok
        ? await prRes.json()
        : null;

     
      const goalsJson = goalsRes.ok
        ? await goalsRes.json()
        : { goals: [] };

      const goalsData: Goal[] = Array.isArray(goalsJson?.goals)
        ? goalsJson.goals
        : [];

      
      const contribData: ContributionResponse = contribRes.ok
        ? await contribRes.json()
        : { data: {} };

      
      const streakData: StreakData | null = streakRes.ok
        ? await streakRes.json()
        : null;

      
      const reposJson = reposRes.ok
        ? await reposRes.json()
        : { repos: [] };
       

      let reposData: RepoData[] = [];

      
      if (Array.isArray(reposJson)) {
        reposData = reposJson;
      } else if (Array.isArray(reposJson?.repos)) {
        reposData = reposJson.repos;
      } else if (Array.isArray(reposJson?.data)) {
        reposData = reposJson.data;
      }

      return {
        prData,
        goalsData,
        contribData,
        streakData,
        reposData,
      };
    } catch (error) {
      console.error("Fetch error:", error);

      return {
        prData: null,
        goalsData: [],
        contribData: { data: {} },
        streakData: null,
        reposData: [],
      };
    }
  };


const buildSummary = async () => {
  const {
    prData,
    goalsData,
    contribData,
    streakData,
    reposData,
  } = await fetchData();

  
  const contributionEntries = Object.entries(
    contribData?.data || {}
  );

  const totalCommits = contributionEntries.reduce(
    (acc, [, value]) => acc + Number(value || 0),
    0
  );

  
  const completedGoals = goalsData.filter(
    (goal) =>
      Number(goal.current) >= Number(goal.target)
  ).length;

  
  let bestDayCount = 0;
  let bestDayLabel = "—";

  for (const [date, count] of contributionEntries) {
    if (Number(count) > bestDayCount) {
      bestDayCount = Number(count);

      bestDayLabel = new Date(date).toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      );
    }
  }

  const weeklyData: Record<string, number> = {};

  contributionEntries.forEach(([date, count]) => {
    const d = new Date(date);

    const firstDay = new Date(d);

    const day = d.getDay();

    const diff =
      firstDay.getDate() -
      day +
      (day === 0 ? -6 : 1);

    firstDay.setDate(diff);

    const weekKey = firstDay
      .toISOString()
      .slice(0, 10);

    weeklyData[weekKey] =
      (weeklyData[weekKey] || 0) +
      Number(count);
  });

  let bestWeekCount = 0;
  let bestWeekLabel = "—";

  Object.entries(weeklyData).forEach(
    ([week, count]) => {
      if (count > bestWeekCount) {
        bestWeekCount = count;

        bestWeekLabel = `Week of ${new Date(
          week
        ).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}`;
      }
    }
  );

  const monthlyData: Record<string, number> = {};

  contributionEntries.forEach(([date, count]) => {
    const monthKey = date.slice(0, 7);

    monthlyData[monthKey] =
      (monthlyData[monthKey] || 0) +
      Number(count);
  });

  let bestMonthCount = 0;
  let bestMonthLabel = "—";

  Object.entries(monthlyData).forEach(
    ([month, count]) => {
      if (count > bestMonthCount) {
        bestMonthCount = count;

        const [year, mon] = month.split("-");

        bestMonthLabel = new Date(
          Number(year),
          Number(mon) - 1
        ).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
      }
    }
  );

  
  const sortedRepos = [...reposData].sort(
  (a, b) =>
      Number(
        b.commits ||
          b.contributions ||
          b.commitCount 
      ) -
      Number(
        a.commits ||
          a.contributions ||
          a.commitCount
      )
  );

  const topRepo = sortedRepos[0];

  

 const currentStreak =
  Number(streakData?.current) || 0;

const longestStreak =
  Number(streakData?.longest) || 0;

 
  const summary = `
🚀 DevTrack Developer Productivity Summary

Hey everyone !!

Excited to share my latest developer productivity snapshot powered by DevTrack!

🔥 Current Streak: ${currentStreak} days

🏆 Longest Streak: ${longestStreak} days

📦 Total Contributions: ${totalCommits} commits

⚡ Best Day: ${bestDayCount} commits (${bestDayLabel})

🔥 Best Week: ${bestWeekCount} commits (${bestWeekLabel})

📅 Most Active Month: ${bestMonthCount} commits (${bestMonthLabel})

🔀 PR Merge Rate: ${
    prData?.mergeRate || "0%"
  }

⭐ Top Repository: ${
    topRepo?.name ||
    topRepo?.repo ||
    "N/A"
  }

  🎯 Goals Completed: ${completedGoals}/${goalsData.length}

Consistent progress is better than perfect progress.

Looking forward to building more, contributing more, and learning every single day 🚀

#DevTrack #OpenSource #GitHub #WebDevelopment #GSSoC #DeveloperJourney
`;

  return summary;
};

const downloadFile = (
  content: string,
  filename: string,
  type: string
) => {
  const blob = new Blob([content], { type });

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");

  a.href = url;

  a.download = filename;

  document.body.appendChild(a);

  a.click();

  document.body.removeChild(a);

  URL.revokeObjectURL(url);
};

const exportCSV = async () => {
  setIsExportingCSV(true);

  try {
    const {
      prData,
      goalsData,
      contribData,
      streakData,
    } = await fetchData();

    const contributionEntries = Object.entries(
      contribData?.data || {}
    );

    const totalCommits = contributionEntries.reduce(
      (acc, [, value]) => acc + Number(value || 0),
      0
    );

    const completedGoals = goalsData.filter(
      (goal) =>
        Number(goal.current) >= Number(goal.target)
    ).length;

    const csvRows = [
      "PR Metrics",
      "Open,Merged,Avg Review Hours,Merge Rate",
      `${prData?.open || 0},${prData?.merged || 0},${prData?.avgReviewHours || 0},${prData?.mergeRate || "0%"}`,
      "",

      "Contribution Metrics",
      "Total Contributions,Current Streak,Longest Streak",
      `${totalCommits},${streakData?.current || 0},${streakData?.longest || 0}`,
      "",

     "Goals",
"Goal,Current,Target,Completed",

...(goalsData.length > 0
  ? goalsData.map(
      (goal) =>
        `"${goal.label}",${goal.current},${goal.target},${
          Number(goal.current) >=
          Number(goal.target)
            ? "Yes"
            : "No"
        }`
    )
  : ["NA,NA,NA,NA"]),
    ];

    const csvContent = csvRows.join("\n");

    downloadFile(
      csvContent,
      "devtrack-dashboard-metrics.csv",
      "text/csv;charset=utf-8;"
    );
  } catch (error) {
    console.error("Failed to export CSV.", error);
  } finally {
    setIsExportingCSV(false);
  }
};
 const copySummary = async () => {
  setIsCopying(true);

  try {
    const summary = await buildSummary();

    await navigator.clipboard.writeText(summary);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  } catch (error) {
    console.error("Failed to copy summary.", error);
  } finally {
    setIsCopying(false);
  }
};
  const exportPDF = async () => {
  setIsExportingPDF(true);

  try {
    
    const summary = await buildSummary();

    const cleanSummary = summary
      .replace(/🚀/g, "")
      .replace(/🔥/g, "")
      .replace(/📦/g, "")
      .replace(/🔀/g, "")
      .replace(/⭐/g, "")
      .replace(/📅/g, "")
      .replace(/⚡/g, "")
      .replace(/🏆/g, "")
      .replace(/📝/g, "")
      .replace(/📖/g, "")
      .replace(/🎯/g, "");

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth =
      doc.internal.pageSize.getWidth();

    const pageHeight =
      doc.internal.pageSize.getHeight();

   
    doc.setFillColor(15, 23, 42);

    doc.rect(0, 0, pageWidth, 28, "F");

    doc.setTextColor(255, 255, 255);

    doc.setFont("helvetica", "bold");

    doc.setFontSize(18);

    doc.text(
      "DevTrack Productivity Summary",
      14,
      18
    );

    doc.setFontSize(10);

    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      14,
      24
    );

   
    doc.setTextColor(40, 40, 40);

    doc.setFont("helvetica", "normal");

    doc.setFontSize(11);

    const lines = doc.splitTextToSize(
      cleanSummary,
      180
    );

    let y = 40;

    lines.forEach((line: string) => {
      
      if (y > pageHeight - 20) {
        doc.addPage();
        y = 20;
      }

      if (
        line.includes("Current Streak") ||
        line.includes("Longest Streak") ||
        line.includes("Total Contributions") ||
        line.includes("Best Day") ||
        line.includes("Best Week") ||
        line.includes("Most Active Month") ||
        line.includes("PR Merge Rate") ||
        line.includes("Top Repository") ||
        line.includes("Repository Activity") ||
        line.includes("Goals Completed")
      ) {
        doc.setFont("helvetica", "bold");
      } else {
        doc.setFont("helvetica", "normal");
      }

      doc.text(line, 14, y);

      y += 7;
    });

    
    const totalPages = doc.getNumberOfPages();

    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);

      doc.setFontSize(9);

      doc.setTextColor(120);

      doc.text(
        `Page ${i} of ${totalPages}`,
        pageWidth - 30,
        pageHeight - 10
      );
    }

    doc.save("devtrack-profile-summary.pdf");
  } catch (error) {
   
    console.error("Failed to export PDF.", error);
  } finally {
    setIsExportingPDF(false);
  }
};
  return (
    <div className="flex flex-wrap gap-3">
      
      <button
  type="button"
  onClick={exportCSV}
  disabled={isExportingCSV}
  className="px-4 py-2 bg-[var(--control)] border border-[var(--border)] text-[var(--card-foreground)] hover:border-[var(--accent)] rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
>
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
    />
  </svg>

  {isExportingCSV
    ? "Exporting..."
    : "Export CSV"}
</button>

      <button
  type="button"
  onClick={copySummary}
  disabled={isCopying}
  className="px-4 py-2 bg-[var(--control)] border border-[var(--border)] text-[var(--card-foreground)] hover:border-[var(--accent)] rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
>
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M8 16h8M8 12h8m-8-4h8M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>

  {isCopying
    ? "Copying..."
    : copied
    ? "Copied!"
    : "Copy Profile Summary"}
</button>
    
      <button
        type="button"
        onClick={exportPDF}
        disabled={isExportingPDF}
        className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 min-w-[140px] justify-center"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>

        {isExportingPDF
          ? "Exporting..."
          : "Download PDF"}
      </button>
    </div>
  );
}


