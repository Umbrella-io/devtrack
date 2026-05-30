"use client";

import { useState } from "react";
import { Download, FileJson, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";

interface ExportStatus {
  type: "success" | "error" | null;
  message: string;
}

export default function DataExportCard() {
  const [exportingJson, setExportingJson] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [status, setStatus] = useState<ExportStatus>({ type: null, message: "" });

  // Helper utility to safely execute download streams client-side using transient DOM anchors
  const triggerClientDownload = (content: string, fileName: string, contentType: string) => {
    const rawBlob = new Blob([content], { type: contentType });
    const downloadUrl = URL.createObjectURL(rawBlob);
    
    const virtualAnchor = document.createElement("a");
    virtualAnchor.href = downloadUrl;
    virtualAnchor.download = fileName;
    
    document.body.appendChild(virtualAnchor);
    virtualAnchor.click();
    
    // Clean up memory space post trigger instantiation safely
    document.body.removeChild(virtualAnchor);
    URL.revokeObjectURL(downloadUrl);
  };

  // Helper function to safely transform aggregated nested metrics object data maps into flattened CSV rows
  const transformToCsvString = (rawSnapshot: any): string => {
    const lines: string[] = [];
    
    // Add file structure description metadata headers
    lines.push("DevTrack User Account Data Record Export");
    lines.push(`Generated Timestamp,${new Date().toISOString()}`);
    lines.push("");

    // Section 1: Base Core Profile Details
    lines.push("=== CORE ACCOUNT PROFILE SUMMARY ===");
    lines.push("Field,Value");
    if (rawSnapshot.user) {
      Object.entries(rawSnapshot.user).forEach(([key, val]) => {
        if (typeof val !== "object") {
          lines.push(`${key},"${String(val).replace(/"/g, '""')}"`);
        }
      });
    }
    lines.push("");

    // Section 2: Active Configured Coding Goals Array Matrix
    lines.push("=== ACTIVE TRACKED MILESTONES & GOALS ===");
    lines.push("Goal ID,Title,Target,Current,Unit,Recurrence,Deadline,Last Synced At");
    
    const goalsArray = Array.isArray(rawSnapshot.goals) 
      ? rawSnapshot.goals 
      : (rawSnapshot.goals?.goals || []);

    if (goalsArray.length > 0) {
      goalsArray.forEach((g: any) => {
        lines.push(
          `"${g.id || ''}","${(g.title || '').replace(/"/g, '""')}",${g.target || 0},${g.current || 0},"${g.unit || ''}","${g.recurrence || 'none'}","${g.deadline || 'N/A'}","${g.last_synced_at || 'N/A'}"`
        );
      });
    } else {
      lines.push("No goals or milestone tracking profiles populated under user account workspace record.");
    }
    
    return lines.join("\n");
  };

  // Aggregated handler pipeline requesting profile snapshots safely
  const executeDataRetrievalPipeline = async (format: "json" | "csv") => {
    if (format === "json") setExportingJson(true);
    if (format === "csv") setExportingCsv(true);
    setStatus({ type: null, message: "" });

    try {
      // Async resource allocation aggregation pulling profile endpoints cleanly
      const [profileRes, goalsRes] = await Promise.all([
        fetch("/api/user/settings"),
        fetch("/api/goals")
      ]);

      if (!profileRes.ok || !goalsRes.ok) {
        throw new Error("Target service returned an operational failure code map during batch retrieval.");
      }

      const profileData = await profileRes.json();
      const goalsData = await goalsRes.json();

      // Compound payload schema structures
      const compiledSnapshot = {
        meta: {
          exporter: "DevTrack Client Core Data Portability Engine",
          version: "1.0.0",
          exported_at: new Date().toISOString()
        },
        user: profileData,
        goals: goalsData
      };

      const fileTimestamp = new Date().toISOString().split("T")[0];

      if (format === "json") {
        const jsonTextBuffer = JSON.stringify(compiledSnapshot, null, 2);
        triggerClientDownload(jsonTextBuffer, `devtrack-user-records-${fileTimestamp}.json`, "application/json");
      } else {
        const csvTextBuffer = transformToCsvString(compiledSnapshot);
        triggerClientDownload(csvTextBuffer, `devtrack-user-records-${fileTimestamp}.csv`, "text/csv;charset=utf-8;");
      }

      setStatus({
        type: "success",
        message: `Account archive successfully serialized and downloaded as ${format.toUpperCase()} format!`
      });
    } catch (err) {
      console.error("Data serialization pipeline fault triggered:", err);
      setStatus({
        type: "error",
        message: "Failed to assemble localized data record archive. Please try again."
      });
    } finally {
      setExportingJson(false);
      setExportingCsv(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-medium)] mt-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-semibold text-[var(--card-foreground)]">
          Export Account Records
        </h2>
        <p className="text-sm text-[var(--muted-foreground)] max-w-xl">
          In alignment with our zero vendor lock-in guarantee, you can download a complete tabular log of your coding goals, repository metric configurations, and system profile states completely offline.
        </p>
      </div>

      <hr className="my-5 border-[var(--border)]" />

      {/* Operation Status Feedback Badges */}
      {status.type && (
        <div className={`mb-5 flex items-start gap-2.5 rounded-xl border p-4 text-sm transition-all duration-300 ${
          status.type === "success"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
            : "border-[var(--destructive)]/30 bg-[var(--destructive)]/10 text-[var(--destructive)]"
        }`}>
          {status.type === "success" ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{status.message}</span>
        </div>
      )}

      {/* Button Grid Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          type="button"
          disabled={exportingJson || exportingCsv}
          onClick={() => executeDataRetrievalPipeline("json")}
          className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--control)] px-4 py-3 text-sm font-semibold text-[var(--card-foreground)] shadow-sm transition-all duration-300 hover:border-[var(--accent)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exportingJson ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          ) : (
            <FileJson className="h-4 w-4 text-[var(--accent)]" />
          )}
          <span>Export as Structured JSON</span>
        </button>

        <button
          type="button"
          disabled={exportingJson || exportingCsv}
          onClick={() => executeDataRetrievalPipeline("csv")}
          className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--control)] px-4 py-3 text-sm font-semibold text-[var(--card-foreground)] shadow-sm transition-all duration-300 hover:border-[var(--accent)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exportingCsv ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
          )}
          <span>Export as Tabular CSV</span>
        </button>
      </div>
    </div>
  );
}