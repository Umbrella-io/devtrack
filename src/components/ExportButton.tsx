"use client";

import { useState } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PRData {
  open: number;
  merged: number;
  avgReviewHours: number;
  mergeRate: string;
}

interface DayData {
  day: string;
  commits: number;
}

interface Goal {
  id: string;
  label: string;
  target: number;
  current: number;
}

export default function ExportButton() {
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const fetchData = async () => {
    const fetchOptions: RequestInit = {
      cache: "no-store",
    };

    const [prRes, goalsRes, contribRes] = await Promise.all([
      fetch(`/api/metrics/prs`, fetchOptions),
      fetch(`/api/goals`, fetchOptions),
      fetch(`/api/metrics/contributions?days=365`, fetchOptions),
    ]);

    const prData: PRData | null = prRes.ok ? await prRes.json() : null;
    const goalsData = goalsRes.ok ? await goalsRes.json() : { goals: [] };
    const contribDataRaw = contribRes.ok ? await contribRes.json() : { data: {} };

    const contribData: DayData[] = Object.entries(contribDataRaw.data ?? {})
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, commits]) => ({ day, commits: commits as number }));

    return { prData, contribData, goalsData: goalsData?.goals as Goal[] };
  };

  const downloadFile = (content: string, filename: string, type: string) => {
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
      const { prData, goalsData, contribData } = await fetchData();

      let csv = "--- PR Metrics ---\n";
      csv += "Open,Merged,Avg Review Hours,Merge Rate\n";
      if (prData) {
        csv += `${prData.open},${prData.merged},${prData.avgReviewHours},${prData.mergeRate}\n`;
      }
      
      if (contribData && contribData.length > 0) {
        csv += "\n--- Contributions ---\n";
        csv += "Date,Commits\n";
        contribData.forEach((d) => {
          csv += `${d.day},${d.commits}\n`;
        });
      }

      if (goalsData && goalsData.length > 0) {
        csv += "\n--- Goals ---\n";
        csv += "Label,Current,Target,Progress (%)\n";
        goalsData.forEach((g) => {
          const pct = g.target > 0 ? ((g.current / g.target) * 100).toFixed(1) : "0";
          csv += `"${g.label}",${g.current},${g.target},${pct}%\n`;
        });
      }

      downloadFile(csv, "dashboard-metrics.csv", "text/csv");
    } finally {
      setIsExportingCSV(false);
    }
  };

  const exportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const { prData, goalsData, contribData } = await fetchData();
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text("Dashboard Metrics Export", 14, 22);
      
      let startY = 30;

      // PR Data
      if (prData) {
        doc.setFontSize(14);
        doc.text("PR Analytics", 14, startY);
        autoTable(doc, {
          startY: startY + 5,
          head: [['Open PRs', 'Merged', 'Avg Review Time', 'Merge Rate']],
          body: [[
            prData.open, 
            prData.merged, 
            `${prData.avgReviewHours}h`, 
            prData.mergeRate
          ]],
        });
      }

      // Goals Data
      if (goalsData && goalsData.length > 0) {
        doc.setFontSize(14);
        doc.text("Goals Tracker", 14, startY);
        autoTable(doc, {
          startY: startY + 5,
          head: [['Goal Label', 'Current', 'Target', 'Progress']],
          body: goalsData.map((g) => {
              const pct = g.target > 0 ? ((g.current / g.target) * 100).toFixed(1) : "0";
              return [g.label, g.current, g.target, `${pct}%`];
          }),
        });
      }

      if (contribData && contribData.length > 0) {
        doc.setFontSize(14);
        doc.text("Commit Activity", 14, startY);
        autoTable(doc, {
          startY: startY + 5,
          head: [['Date', 'Commits']],
          body: contribData.map((d) => [d.day, d.commits]),
        });
      }

      doc.save("dashboard-metrics.pdf");
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="flex gap-3">
      <button 
        type="button"
        onClick={exportCSV}
        disabled={isExportingCSV}
        className="px-4 py-2 bg-[var(--control)] border border-[var(--border)] text-[var(--card-foreground)] hover:border-[var(--accent)] rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {isExportingCSV ? "Exporting..." : "Export CSV"}
      </button>

      <button 
        type="button"
        onClick={exportPDF}
        disabled={isExportingPDF}
        className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {isExportingPDF ? "Exporting..." : "Export PDF"}
      </button>
    </div>
  );
}