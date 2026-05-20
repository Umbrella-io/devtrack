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

      // FIX: Separate sheets using proper CSV sections without dashes
      // PR Metrics sheet
      let csv = "PR Metrics\n";
      csv += "Open,Merged,Avg Review Hours,Merge Rate\n";
      if (prData) {
        csv += `${prData.open},${prData.merged},${prData.avgReviewHours},${prData.mergeRate}\n`;
      }

      // Contributions sheet
      if (contribData && contribData.length > 0) {
        csv += "\nCommit Activity\n";
        csv += "Date,Commits\n";
        contribData.forEach((d) => {
          csv += `${d.day},${d.commits}\n`;
        });
      }

      // Goals sheet
      if (goalsData && goalsData.length > 0) {
        csv += "\nGoals\n";
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

      // Title
      doc.setFontSize(20);
      doc.setTextColor(40, 40, 40);
      doc.text("Dashboard Metrics Export", 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 27);

      // FIX: Track Y position properly after each table
      let currentY = 35;

      // PR Analytics section
      if (prData) {
        doc.setFontSize(13);
        doc.setTextColor(40, 40, 40);
        doc.text("PR Analytics", 14, currentY);
        autoTable(doc, {
          startY: currentY + 5,
          head: [["Open PRs", "Merged", "Avg Review Time", "Merge Rate"]],
          body: [[
            prData.open,
            prData.merged,
            `${prData.avgReviewHours}h`,
            prData.mergeRate,
          ]],
          styles: { fontSize: 10 },
          headStyles: { fillColor: [59, 130, 246] },
        });
        // FIX: Update currentY after table using lastAutoTable
        currentY = (doc as any).lastAutoTable.finalY + 12;
      }

      // Goals section
      if (goalsData && goalsData.length > 0) {
        doc.setFontSize(13);
        doc.setTextColor(40, 40, 40);
        doc.text("Goals Tracker", 14, currentY);
        autoTable(doc, {
          startY: currentY + 5,
          head: [["Goal Label", "Current", "Target", "Progress"]],
          body: goalsData.map((g) => {
            const pct = g.target > 0 ? ((g.current / g.target) * 100).toFixed(1) : "0";
            return [g.label, g.current, g.target, `${pct}%`];
          }),
          styles: { fontSize: 10 },
          headStyles: { fillColor: [59, 130, 246] },
        });
        currentY = (doc as any).lastAutoTable.finalY + 12;
      }

      // Commit Activity section
      if (contribData && contribData.length > 0) {
        doc.setFontSize(13);
        doc.setTextColor(40, 40, 40);
        doc.text("Commit Activity", 14, currentY);
        autoTable(doc, {
          startY: currentY + 5,
          head: [["Date", "Commits"]],
          body: contribData.map((d) => [d.day, d.commits]),
          styles: { fontSize: 10 },
          headStyles: { fillColor: [59, 130, 246] },
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
        className="px-4 py-2 bg-[var(--control)] border border-[var(--border)] text-[var(--card-foreground)] hover:border-[var(--accent)] rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 min-w-[140px] justify-center"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        {isExportingCSV ? "Exporting..." : "Export CSV"}
      </button>

      <button
        type="button"
        onClick={exportPDF}
        disabled={isExportingPDF}
        className="px-4 py-2 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50 min-w-[140px] justify-center"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {isExportingPDF ? "Exporting..." : "Export PDF"}
      </button>
    </div>
  );
}