"use client";

import { BarChart, Bar, LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { TimelinePoint } from "@/lib/repoAnalytics";

export default function RepoTimelineChart({ timeline }: { timeline: TimelinePoint[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div
        className="h-52 rounded-xl border border-[var(--border)] p-3"
        style={{ backgroundColor: "color-mix(in srgb, var(--card) 40%, transparent)" }}
      >
        <ResponsiveContainer>
          <LineChart data={timeline}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis width={28} stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--card-foreground)",
              }}
              labelStyle={{
                color: "var(--card-foreground)",
              }}
              itemStyle={{
                color: "var(--card-foreground)",
              }}
            />
            <Legend 
              wrapperStyle={{ 
                color: "var(--foreground)",
                paddingTop: "10px"
              }}
              formatter={(value) => (
                <span style={{ color: "var(--foreground)" }}>{value}</span>
              )}
            />
            <Line 
              type="monotone" 
              dataKey="commits" 
              stroke="var(--accent)" 
              strokeWidth={2} 
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="prs" 
              stroke="var(--accent-secondary)" 
              strokeWidth={2} 
              dot={false}
            />
            <Line 
              type="monotone" 
              dataKey="issues" 
              stroke="var(--warning)" 
              strokeWidth={2} 
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div
        className="h-52 rounded-xl border border-[var(--border)] p-3"
        style={{ backgroundColor: "color-mix(in srgb, var(--card) 40%, transparent)" }}
      >
        <ResponsiveContainer>
          <BarChart data={timeline}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis width={28} stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--card-foreground)",
              }}
              labelStyle={{
                color: "var(--card-foreground)",
              }}
              itemStyle={{
                color: "var(--card-foreground)",
              }}
            />
            <Bar 
              dataKey="commits" 
              fill="var(--accent)" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
