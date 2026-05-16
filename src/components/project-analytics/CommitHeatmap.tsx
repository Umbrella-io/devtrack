"use client";

import { HeatmapPoint } from "@/lib/projectAnalytics";

const colorForCount = (count: number) => {
  if (count === 0) return "bg-slate-800";
  if (count <= 1) return "bg-indigo-900";
  if (count <= 3) return "bg-indigo-700";
  if (count <= 6) return "bg-indigo-500";
  return "bg-indigo-300";
};

export default function CommitHeatmap({ points }: { points: HeatmapPoint[] }) {
  return (
    <div className="grid grid-cols-10 gap-1 sm:grid-cols-[repeat(15,minmax(0,1fr))] md:grid-cols-[repeat(30,minmax(0,1fr))]">
      {points.map((point) => (
        <div key={point.date} title={`${point.date}: ${point.count} commits`} className={`h-3 w-full rounded-sm ${colorForCount(point.count)}`} />
      ))}
    </div>
  );
}
