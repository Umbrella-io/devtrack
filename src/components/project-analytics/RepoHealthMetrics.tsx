"use client";

import { RepoHealth } from "@/lib/projectAnalytics";

const meterColor = (value: number) => (value >= 75 ? "bg-emerald-400" : value >= 45 ? "bg-amber-400" : "bg-rose-400");

export default function RepoHealthMetrics({ health }: { health: RepoHealth }) {
  const metrics = [
    { label: "Commit consistency", value: health.consistency },
    { label: "PR merge efficiency", value: health.mergeEfficiency },
    { label: "Maintenance score", value: health.maintenanceScore },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-200">Development activity</span>
        <span className="rounded-full border border-slate-600 px-2 py-0.5 text-xs text-slate-300">{health.activityLevel}</span>
      </div>
      {metrics.map((metric) => (
        <div key={metric.label}>
          <div className="mb-1 flex justify-between text-xs text-slate-300">
            <span>{metric.label}</span>
            <span>{metric.value}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
            <div className={`h-full ${meterColor(metric.value)}`} style={{ width: `${metric.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
