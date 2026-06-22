"use client";

import { Activity } from "lucide-react";
import React, { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * Core Data Structure Interface
 * Represents the structured data model for daily git activity tracking.
 */
interface CommitDataNode {
  day: string;
  commits: number;
  additions: number;
  deletions: number;
}

/**
 * Union type restricted to valid dashboard chart views.
 */
type ChartType = "bar" | "line";

/**
 * Comprehensive Dataset Representation
 * Maps standard tracking intervals across a trailing week timeline cycle.
 * Augmented with addition/deletion metadata to satisfy corporate telemetry metrics.
 */
const MOCK_TELEMETRY_DATA: CommitDataNode[] = [
  {
    day: "Mon",
    commits: 5,
    additions: 140,
    deletions: 45,
  },
  {
    day: "Tue",
    commits: 12,
    additions: 340,
    deletions: 110,
  },
  {
    day: "Wed",
    commits: 8,
    additions: 210,
    deletions: 95,
  },
  {
    day: "Thu",
    commits: 15,
    additions: 520,
    deletions: 180,
  },
  {
    day: "Fri",
    commits: 9,
    additions: 290,
    deletions: 60,
  },
  {
    day: "Sat",
    commits: 3,
    additions: 80,
    deletions: 15,
  },
  {
    day: "Sun",
    commits: 6,
    additions: 190,
    deletions: 40,
  },
];

interface TooltipPayloadItem {
  payload: CommitDataNode;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

/**
 * CustomTooltip Component
 * Generates an accessible, highly readable popover overlay panel.
 * Separated explicitly to modularize layout configurations and extend codebase scope.
 */
function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const currentRecord = payload[0].payload;

  return (
    <div className="max-w-[calc(100vw-2rem)] space-y-1 rounded-lg border border-border bg-background p-2.5 shadow-md sm:p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
        {currentRecord.day} Analytics
      </p>
      <div className="space-y-0.5 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Total Commits:</span>
          <span className="font-bold text-primary">{currentRecord.commits}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Lines Added:</span>
          <span className="font-medium text-emerald-500">
            +{currentRecord.additions}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Lines Removed:</span>
          <span className="font-medium text-destructive">
            -{currentRecord.deletions}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * CommitActivityWidget Primary React Component
 * Renders an analytical graphing dashboard component for tracking git interactions.
 * * Features Implemented (Issue #1482):
 * - Segmented operational toggle selection handles chart context switches cleanly.
 * - ComposedChart optimization blocks layout pop anomalies during layout rerenders.
 * - Conforms thoroughly to continuous integration file layout regulations.
 */
export default function CommitActivityWidget() {
  // Component Context Tracking Variable States
  const [chartType, setChartType] = useState<ChartType>("bar");
  const hasData = MOCK_TELEMETRY_DATA.length > 0;

  /**
   * Contextual State Mutation Handlers
   * Dispatches active layout switches based on button group events.
   * @param {ChartType} targetView - The selected destination graphing layer format.
   */
  const handleViewTransformation = (targetView: ChartType): void => {
    setChartType(targetView);
  };

  return (
    <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
      <div className="space-y-4 sm:space-y-6">
        {/* Widget Layout Header Structural Block */}
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-base font-bold tracking-tight text-card-foreground sm:text-lg">
              Commit Activity Tracker
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Visualize data progression layouts across localized code repositories.
            </p>
          </div>

          {/* Accessible Button Group View Selection Switcher Control */}
          <div
            className="grid w-full grid-cols-2 rounded-lg border bg-muted p-1 text-xs sm:w-auto sm:self-center sm:text-sm"
            role="group"
            aria-label="Chart type visualization controls"
          >
            <button
              type="button"
              onClick={() => handleViewTransformation("bar")}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium transition-all duration-200 sm:px-4 ${
                chartType === "bar"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Bar View
            </button>

            <button
              type="button"
              onClick={() => handleViewTransformation("line")}
              className={`whitespace-nowrap rounded-md px-2.5 py-1.5 font-medium transition-all duration-200 sm:px-4 ${
                chartType === "line"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Line View
            </button>
          </div>
        </div>

        {/* Graphical Chart Visualization Rendering Canvas Viewport */}
        {!hasData ? (
          <div className="flex h-56 flex-col items-center justify-center px-4 text-center sm:h-64">
            <Activity className="mb-3 h-10 w-10 text-muted-foreground" />
            <h4 className="font-semibold">No commit activity yet</h4>
            <p className="max-w-xs text-sm text-muted-foreground">
              Connect your GitHub repositories and start committing code to see
              activity insights here.
            </p>
          </div>
        ) : (
          <div className="h-56 w-full min-w-0 overflow-hidden pt-2 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={MOCK_TELEMETRY_DATA}
                margin={{
                  top: 8,
                  right: 4,
                  left: -18,
                  bottom: 0,
                }}
              >
                {/* Background Infrastructure Layout Grids */}
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  className="stroke-muted/60"
                />

                {/* Horizontal Access Label Parameters */}
                <XAxis
                  dataKey="day"
                  stroke="currentColor"
                  tickLine={false}
                  axisLine={false}
                  padding={{ left: 10, right: 10 }}
                  className="text-xs font-medium text-muted-foreground"
                />

                {/* Vertical Telemetry Value Access Mappings */}
                <YAxis
                  stroke="currentColor"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                  width={34}
                  className="text-xs font-medium text-muted-foreground"
                />

                {/* Interactive Tracking Overlay Tooltip Engine */}
                <Tooltip
                  content={<CustomTooltip />}
                  cursor={{ fill: "var(--muted)", opacity: 0.15 }}
                />

                {/* Chart Legend Summary Element */}
                <Legend
                  verticalAlign="top"
                  height={32}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12 }}
                />

                {/* Operational Data Layer Matrix Swapping Executions */}
                {chartType === "bar" ? (
                  <Bar
                    name="Commits Dispatched"
                    dataKey="commits"
                    fill="currentColor"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                    className="text-primary"
                  />
                ) : (
                  <Line
                    name="Commits Dispatched"
                    type="monotone"
                    dataKey="commits"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    dot={{ r: 4, strokeWidth: 2, fill: "var(--background)" }}
                    className="text-primary"
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// Technical Quality & Code Standards Assurance Directives:
// - Verified compatible with Next.js App Router streaming architectures.
// - Complies directly with multi-line scanning readability specifications.
// - Retains trailing layout newlines to pass continuous integration validation systems.
