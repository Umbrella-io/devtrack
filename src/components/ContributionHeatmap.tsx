"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useHeatmapTheme } from "@/hooks/useHeatmapTheme";
import DailyBreakdownSheet from "@/components/DailyBreakdownSheet";

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

// Memoized formatting engine to avoid recreation garbage collection cycles inside render loops
const monthFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export default function ContributionHeatmap({
  days = DEFAULT_DAYS,
}: ContributionHeatmapProps) {
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const handleCloseSheet = useCallback(() => setSelectedDate(null), []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    fetch(`/api/metrics/contributions?days=${days}`)
      .then((response) => {
        if (!response.ok) throw new Error("API error");
        return response.json();
      })
      .then((result: ContributionResponse) => {
        if (!active) return;
        setData(result.data ?? {});
        setLastUpdated(new Date());
        setMinutesAgo(0);
      })
      .catch(() => {
        if (!active) return;
        setError("Failed to load contribution heatmap.");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
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

  const { themeConfig, theme, setTheme } = useHeatmapTheme();
  const cells = useMemo(() => buildHeatmap(days, data), [days, data]);
  const weekCount = Math.ceil(cells.length / 7);
  const maxCommits = Math.max(
  ...cells.map((cell) => cell.count),
  1
);
  // 100% MATHEMATICALLY PRECISE MONTH TRACKING SYSTEM
  const monthMarkers = useMemo(() => {
    const markers: Array<{ label: string; weekIndex: number }> = [];
    const seenMonths = new Set<string>();

    for (let w = 0; w < weekCount; w++) {
      const weekCells = cells.slice(w * 7, (w + 1) * 7);

      for (const cell of weekCells) {
        if (!cell.inRange) continue;

        const currentMonth = cell.date.getMonth();
        const currentYear = cell.date.getFullYear();
        const monthKey = `${currentYear}-${currentMonth}`;

        if (!seenMonths.has(monthKey)) {
          seenMonths.add(monthKey);

          markers.push({
            label: monthFormatter.format(cell.date),
            weekIndex: w,
          });
          break; // Move immediately to scanning the next column track block
        }
      }
    }
    return markers;
  }, [cells, weekCount]);

  // Shared matrix geometries matching baseline canvas dimensions
  const totalGridWidth = LABEL_WIDTH + (weekCount * CELL_SIZE) + ((weekCount - 1) * CELL_GAP);

  const gridStyle = {
    gridTemplateColumns: `${LABEL_WIDTH}px repeat(${weekCount}, ${CELL_SIZE}px)`,
    gridTemplateRows: `repeat(7, ${CELL_SIZE}px)`,
    columnGap: `${CELL_GAP}px`,
    rowGap: `${CELL_GAP}px`,
  } as const;

  const today = new Date();
  const getHeatmapColor = (count: number) => {
  if (count === 0) return themeConfig.missed;

  const normalized = count / maxCommits;

  if (normalized <= 0.25) {
    return themeConfig.levelOne;
  }

  if (normalized <= 0.5) {
    return themeConfig.levelTwo;
  }

  if (normalized <= 0.75) {
    return themeConfig.levelThree;
  }

  return themeConfig.levelFour;
};

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-[var(--card-foreground)]">Contribution Heatmap</h2>
          <p className="text-sm text-[var(--muted-foreground)]">Last {days} days of commit activity.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme("default")}
            style={theme === "default" ? { backgroundColor: themeConfig.accent, color: "#fff" } : undefined}
            className="rounded px-2 py-1 text-xs"
          >
            Default
          </button>
          <button
            type="button"
            onClick={() => setTheme("colour-blind-friendly")}
            style={theme === "colour-blind-friendly" ? { backgroundColor: themeConfig.accent, color: "#fff" } : undefined}
            className="rounded px-2 py-1 text-xs"
          >
            Colour-blind
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
          <span>Less</span>
          <div className="flex items-center gap-1">
            {[
  0,
  Math.ceil(maxCommits * 0.25),
  Math.ceil(maxCommits * 0.5),
  Math.ceil(maxCommits * 0.75),
  maxCommits,
].map((count) => {
              const swatch = getHeatmapColor(count);
                
              return (
                <span
                  key={count}
                  className="h-3 w-3 rounded-sm border"
                  style={{ backgroundColor: swatch, borderColor: themeConfig.border }}
                />
              );
            })}
          </div>
          <span>More</span>
        </div>
      </div>

      {loading ? (
        <div className="h-[180px] animate-pulse rounded-lg bg-[var(--card-muted)]" />
      ) : error ? (
        <div className="flex h-[180px] items-center rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive)]/10 px-4">
          <p className="text-sm text-[var(--destructive)]">{error} Please try refreshing.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto pb-2  scrollbar-thin">
            <div className="mx-auto flex flex-col gap-1" style={{ width: `${totalGridWidth}px` }}>
              
              {/* MATHEMATICAL COORDINATE TIMELINE HEADER BANNER CONTAINER */}
              <div 
                className="relative w-full text-[10px] font-medium text-[var(--muted-foreground)]" 
                style={{ height: `${HEADER_HEIGHT}px` }}
              >
                {monthMarkers.map((marker) => {
                  const absoluteLeftOffset = LABEL_WIDTH + (marker.weekIndex * (CELL_SIZE + CELL_GAP));

                  return (
                    <div
                      key={`${marker.label}-${marker.weekIndex}`}
                      className="absolute top-0 text-left overflow-hidden text-ellipsis whitespace-nowrap"
                      style={{
                        left: `${absoluteLeftOffset}px`,
                        width: "auto",
                        minWidth: "max-content",
                        paddingRight: "4px",
                      }}
                    >
                      {marker.label}
                    </div>
                  );
                })}
              </div>

              {/* Grid System Area mapping identical columns */}
              <div className="grid items-center" style={gridStyle}>
                {DAY_LABELS.map((label, rowIndex) => (
                  <div
                    key={label}
                    className="flex items-center justify-end pr-2 text-[10px] text-[var(--muted-foreground)]"
                    style={{
                      gridRow: rowIndex + 1,
                      gridColumn: 1,
                      opacity: rowIndex % 2 === 0 ? 1 : 0,
                    }}
                  >
                    {rowIndex % 2 === 0 ? label : ""}
                  </div>
                ))}

                {cells.map((cell, index) => {
                  const weekIndex = Math.floor(index / 7);
                  const dayIndex = index % 7;
                  const isFuture = cell.date > today;
                  const showTooltipBelow = dayIndex < 2;
                  const isNearRightEdge = weekIndex >= weekCount - 3;
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
                      onClick={() => !isFuture && setSelectedDate(cell.dateKey)}
                      className={`group relative z-0 h-3 w-3 rounded-[3px] border transition-transform hover:z-20 hover:scale-110 focus:z-20 focus:outline-none focus:ring-2 focus:ring-[var(--heatmap-focus-ring)] disabled:cursor-default disabled:opacity-30 ${
                        cell.inRange ? "" : "opacity-35"
                      }`}
                      style={{
                        gridRow: dayIndex + 1,
                        gridColumn: weekIndex + 2,
                        backgroundColor: isFuture
                          ? "transparent"
                          : getHeatmapColor(cell.count),

                        borderColor: themeConfig.border,
                        ["--heatmap-focus-ring" as any]: themeConfig.accent,
                      }}
                    >
                      {!isFuture && (
                        <span
                          className={`pointer-events-none absolute z-50 hidden whitespace-nowrap rounded-md bg-[var(--foreground)] px-2 py-1 text-[11px] text-[var(--background)] shadow-lg group-hover:block group-focus:block ${
                            showTooltipBelow ? "top-full mt-2" : "bottom-full mb-2"
                          } ${
                            isNearRightEdge
                              ? "right-0 translate-x-0"
                              : "left-1/2 -translate-x-1/2"
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
            {lastUpdated && (
              <p>{minutesAgo === 0 ? "Updated just now" : `Updated ${minutesAgo} min ago`}</p>
            )}
          </div>
        </>
      )}
      <DailyBreakdownSheet
        date={selectedDate}
        onClose={handleCloseSheet}
        heatmapData={data}
      />
    </div>
  );
}


