"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

interface ContributionHeatmapProps {
  days?: number;
}

interface ContributionResponse {
  data: Record<string, number>;
}

interface HeatmapCell {
  date: Date;
  dateKey: string;
  count: number;
  inRange: boolean;
}

const DEFAULT_DAYS = 365;
const CELL_SIZE = 12;
const CELL_GAP = 2;
const LABEL_WIDTH = 42;
const HEADER_HEIGHT = 18;
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getHeatmapCellStyle(count: number): CSSProperties {
  if (count === 0) {
    return { backgroundColor: "var(--control)" };
  }

  const opacity = count >= 10 ? 1 : count >= 6 ? 0.75 : count >= 3 ? 0.5 : 0.25;

  return {
    backgroundColor: `color-mix(in srgb, var(--accent) ${opacity * 100}%, transparent)`,
  };
}

function buildHeatmap(days: number, contributions: Record<string, number>) {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  const firstWeekStart = new Date(startDate);
  firstWeekStart.setDate(startDate.getDate() - startDate.getDay());
  firstWeekStart.setHours(0, 0, 0, 0);

  const lastWeekEnd = new Date(endDate);
  lastWeekEnd.setDate(endDate.getDate() + (6 - endDate.getDay()));
  lastWeekEnd.setHours(23, 59, 59, 999);

  const cells: HeatmapCell[] = [];
  const cursor = new Date(firstWeekStart);

  while (cursor <= lastWeekEnd) {
    const dateKey = formatDateKey(cursor);

    cells.push({
      date: new Date(cursor),
      dateKey,
      count: contributions[dateKey] ?? 0,
      inRange: cursor >= startDate && cursor <= endDate,
    });

    cursor.setDate(cursor.getDate() + 1);
  }

  return cells;
}

export default function ContributionHeatmap({ days = DEFAULT_DAYS }: ContributionHeatmapProps) {
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/metrics/contributions?days=${days}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("API error");
        }

        return response.json();
      })
      .then((result: ContributionResponse) => {
        if (!active) return;
        setData(result.data ?? {});
      })
      .catch(() => {
        if (!active) return;
        setError("Failed to load contribution heatmap.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
        setLastUpdated(new Date());
        setMinutesAgo(0);
      });

    return () => {
      active = false;
    };
  }, [days]);

  useEffect(() => {
    if (!lastUpdated) return;

    const interval = setInterval(() => {
      setMinutesAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 60000));
    }, 60000);

    return () => clearInterval(interval);
  }, [lastUpdated]);

  const cells = useMemo(() => buildHeatmap(days, data), [days, data]);
  const weekCount = Math.ceil(cells.length / 7);
  const monthMarkers = useMemo(() => {
    const seen = new Set<string>();

    return cells.reduce<Array<{ label: string; weekIndex: number }>>((markers, cell, index) => {
      if (!cell.inRange) return markers;

      const monthKey = `${cell.date.getFullYear()}-${cell.date.getMonth()}`;
      if (seen.has(monthKey)) return markers;

      seen.add(monthKey);
      markers.push({
        label: cell.date.toLocaleDateString("en-US", { month: "short" }),
        weekIndex: Math.floor(index / 7),
      });

      return markers;
    }, []);
  }, [cells]);

  const gridStyle = {
    gridTemplateColumns: `${LABEL_WIDTH}px repeat(${weekCount}, ${CELL_SIZE}px)`,
    gridTemplateRows: `${HEADER_HEIGHT}px repeat(7, ${CELL_SIZE}px)`,
    columnGap: `${CELL_GAP}px`,
    rowGap: `${CELL_GAP}px`,
  } as const;

  const today = new Date();

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--card-foreground)]">Contribution Heatmap</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Last {days} days of commit activity.</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span>Less</span>
          <div className="flex items-center gap-1">
            {[0, 1, 3, 6, 10].map((count) => (
              <span key={count} className="h-3 w-3 rounded-sm border border-[var(--border)]" style={getHeatmapCellStyle(count)} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      {loading ? (
        <div className="h-[180px] rounded-lg bg-[var(--card-muted)] animate-pulse" />
      ) : error ? (
        <div className="flex h-[180px] items-center rounded-lg border border-red-500/30 bg-red-500/10 px-4">
          <p className="text-sm text-red-400">{error} Please try refreshing.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto pb-2">
            <div className="w-max mx-auto">
              <div className="grid items-end" style={gridStyle}>
                <div />
                {monthMarkers.map((marker) => (
                  <div
                    key={`${marker.label}-${marker.weekIndex}`}
                    className="text-left text-[10px] font-medium text-[var(--muted-foreground)]"
                    style={{ gridRow: 1, gridColumn: marker.weekIndex + 2 }}
                  >
                    {marker.label}
                  </div>
                ))}

                {DAY_LABELS.map((label, rowIndex) => (
                  <div
                    key={label}
                    className="flex items-center justify-end pr-1 text-[10px] text-[var(--muted-foreground)]"
                    style={{ gridRow: rowIndex + 2, gridColumn: 1, opacity: rowIndex % 2 === 0 ? 1 : 0 }}
                  >
                    {rowIndex % 2 === 0 ? label : ""}
                  </div>
                ))}

                {cells.map((cell, index) => {
                  const weekIndex = Math.floor(index / 7);
                  const dayIndex = index % 7;
                  const isFuture = cell.date > today;
                  const showTooltipBelow = dayIndex < 2;
                  const tooltip = `${cell.date.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}: ${cell.count} commit${cell.count === 1 ? "" : "s"}`;

                  return (
                    <button
                      key={cell.dateKey}
                      type="button"
                      title={isFuture ? "" : tooltip}
                      aria-label={isFuture ? `${cell.dateKey}: future date` : tooltip}
                      disabled={isFuture}
                      className={`group relative z-0 h-3 w-3 rounded-[3px] border border-[var(--border)] transition-transform hover:z-20 hover:scale-110 focus:z-20 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:cursor-default disabled:opacity-30 ${cell.inRange ? "" : "opacity-35"}`}
                      style={{ gridRow: dayIndex + 2, gridColumn: weekIndex + 2, ...getHeatmapCellStyle(isFuture ? 0 : cell.count) }}
                    >
                      {!isFuture && (
                        <span
                          className={`pointer-events-none absolute left-1/2 z-50 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--foreground)] px-2 py-1 text-[11px] text-[var(--background)] shadow-lg group-hover:block group-focus:block ${
                            showTooltipBelow ? "top-full mt-2" : "bottom-full mb-2"
                          }`}
                        >
                          {tooltip}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 text-xs text-[var(--muted-foreground)]">
            <p>
              {cells.filter((cell) => cell.inRange).reduce((total, cell) => total + cell.count, 0)} commits shown across {days} days.
            </p>
            {lastUpdated && <p>{minutesAgo === 0 ? "Updated just now" : `Updated ${minutesAgo} min ago`}</p>}
          </div>
        </>
      )}
    </div>
  );
}