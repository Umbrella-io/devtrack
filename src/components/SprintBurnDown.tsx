"use client";

import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
  ResponsiveContainer,
  Area,
} from "recharts";
import { BurnDownDataPoint } from "./useBurnDownData";

interface SprintBurnDownProps {
  data: BurnDownDataPoint[];
  totalPoints: number;
  sprintDays: number;
  velocity: number;
  predictedCompletionDay: number | null;
  isDelayed: boolean;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl text-sm">
      <p className="text-gray-400 mb-2 font-medium">Day {label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 mb-1">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-300">{entry.name}:</span>
          <span className="text-white font-semibold">
            {entry.value != null ? `${entry.value} pts` : "—"}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function SprintBurnDown({
  data,
  totalPoints,
  velocity,
  predictedCompletionDay,
  isDelayed,
}: SprintBurnDownProps) {
  // Find scope creep spikes
  const scopeCreepDays = data.filter((d) => d.scopeCreep);

  return (
    <div className="w-full">
      {/* Legend pills */}
      <div className="flex flex-wrap gap-3 mb-5 px-1">
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-6 h-0.5 bg-blue-400 inline-block rounded" />
          Ideal Burn
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-6 h-0.5 bg-emerald-400 inline-block rounded" />
          Actual Progress
        </span>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <span className="w-6 h-0.5 border-t-2 border-dashed border-orange-400 inline-block" />
          Forecast
        </span>
        {scopeCreepDays.length > 0 && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
            Scope Creep
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
        >
          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#34d399" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#34d399" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />

          <XAxis
            dataKey="day"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#374151" }}
            label={{
              value: "Sprint Day",
              position: "insideBottomRight",
              offset: -8,
              fill: "#4b5563",
              fontSize: 11,
            }}
          />

          <YAxis
            tick={{ fill: "#6b7280", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            domain={[0, totalPoints + 10]}
            label={{
              value: "Story Points",
              angle: -90,
              position: "insideLeft",
              offset: 12,
              fill: "#4b5563",
              fontSize: 11,
            }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Ideal burn area (subtle fill) */}
          <Area
            type="linear"
            dataKey="ideal"
            name="Ideal Burn"
            stroke="#60a5fa"
            strokeWidth={2}
            fill="transparent"
            dot={false}
            activeDot={{ r: 4, fill: "#60a5fa" }}
            strokeDasharray="0"
          />

          {/* Actual progress with gradient fill */}
          <Area
            type="monotone"
            dataKey="actual"
            name="Actual Progress"
            stroke="#34d399"
            strokeWidth={2.5}
            fill="url(#actualGradient)"
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (payload?.scopeCreep) {
                return (
                  <circle
                    key={`dot-${payload.day}`}
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill="#ef4444"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                );
              }
              if (payload?.actual == null) return <g key={`empty-${payload.day}`} />;
              return (
                <circle
                  key={`dot-${payload.day}`}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill="#34d399"
                  stroke="transparent"
                />
              );
            }}
            activeDot={{ r: 5, fill: "#34d399", stroke: "#111827", strokeWidth: 2 }}
            connectNulls={false}
          />

          {/* Forecast line */}
          <Line
            type="linear"
            dataKey="forecast"
            name="Forecast"
            stroke="#fb923c"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 4, fill: "#fb923c" }}
            connectNulls
          />

          {/* Scope creep reference dots */}
          {scopeCreepDays.map((point) => (
            <ReferenceDot
              key={`scope-${point.day}`}
              x={point.day}
              y={point.actual ?? 0}
              r={8}
              fill="transparent"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="3 2"
            />
          ))}

          {/* Predicted completion marker */}
          {predictedCompletionDay != null && (
            <ReferenceDot
              x={predictedCompletionDay}
              y={0}
              r={5}
              fill={isDelayed ? "#ef4444" : "#34d399"}
              stroke="#111827"
              strokeWidth={2}
              label={{
                value: isDelayed ? `⚠ Day ${predictedCompletionDay}` : `✓ Day ${predictedCompletionDay}`,
                position: "top",
                fill: isDelayed ? "#ef4444" : "#34d399",
                fontSize: 11,
                fontWeight: 600,
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>

      {/* Velocity note */}
      <div
        className={`mt-4 mx-1 flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
          isDelayed
            ? "border-red-800 bg-red-950/40 text-red-300"
            : "border-emerald-800 bg-emerald-950/40 text-emerald-300"
        }`}
      >
        <span className="text-base leading-none mt-0.5">{isDelayed ? "⚠️" : "✅"}</span>
        <span>
          <strong>Velocity:</strong> {velocity.toFixed(1)} pts/day.{" "}
          {isDelayed
            ? `At this pace, sprint will finish ~${predictedCompletionDay != null ? predictedCompletionDay - data.filter(d => d.day <= data.length).length : "?"} days late.`
            : "On track to complete before sprint deadline."}
        </span>
      </div>
    </div>
  );
}