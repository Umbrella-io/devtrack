"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { LanguageSlice } from "@/lib/projectAnalytics";

export default function RepoLanguagePie({ data }: { data: LanguageSlice[] }) {
  if (!data.length) {
    return <div className="h-24 w-full rounded-lg bg-white/5" />;
  }

  return (
    <div className="h-24 w-full min-w-0">
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="percentage" nameKey="name" innerRadius={20} outerRadius={35} paddingAngle={2} isAnimationActive animationDuration={700}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10, color: "#e2e8f0", fontSize: 12 }}
            formatter={(value: number, name: string) => [`${value}%`, name]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
