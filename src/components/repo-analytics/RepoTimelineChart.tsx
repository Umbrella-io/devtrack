"use client";

import { BarChart, Bar, LineChart, Line, ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { TimelinePoint } from "@/lib/repoAnalytics";

export default function RepoTimelineChart({ timeline }: { timeline: TimelinePoint[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="h-52 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
        <ResponsiveContainer>
          <LineChart data={timeline}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis width={28} stroke="#94a3b8" />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10 }} />
            <Legend />
            <Line type="monotone" dataKey="commits" stroke="#818cf8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="prs" stroke="#22d3ee" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="issues" stroke="#f97316" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="h-52 rounded-xl border border-slate-700/60 bg-slate-900/40 p-3">
        <ResponsiveContainer>
          <BarChart data={timeline}>
            <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
            <XAxis dataKey="date" hide />
            <YAxis width={28} stroke="#94a3b8" />
            <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 10 }} />
            <Bar dataKey="commits" fill="#818cf8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
