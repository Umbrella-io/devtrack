import { useMemo } from "react";

export interface SprintIssue {
  id: string;
  title: string;
  storyPoints: number;
  closedAt: Date | null; // null = still open
  createdAt: Date;
}

export interface BurnDownDataPoint {
  day: number;
  ideal: number;
  actual: number | null; // null for future days
  forecast: number | null; // null for past days (before today)
  scopeCreep: boolean; // true if new points were added on this day
}

export interface BurnDownStats {
  data: BurnDownDataPoint[];
  totalPoints: number;
  velocity: number; // pts burned per day (rolling avg)
  predictedCompletionDay: number | null;
  isDelayed: boolean;
  completedPoints: number;
  remainingPoints: number;
}

interface UseBurnDownDataArgs {
  issues: SprintIssue[];
  sprintStartDate: Date;
  sprintEndDate: Date;
}

export function useBurnDownData({
  issues,
  sprintStartDate,
  sprintEndDate,
}: UseBurnDownDataArgs): BurnDownStats {
  return useMemo(() => {
    const msPerDay = 1000 * 60 * 60 * 24;
    const totalSprintDays =
      Math.round(
        (sprintEndDate.getTime() - sprintStartDate.getTime()) / msPerDay
      ) + 1;

    const today = new Date();
    const currentDay = Math.min(
      Math.max(
        Math.round(
          (today.getTime() - sprintStartDate.getTime()) / msPerDay
        ) + 1,
        1
      ),
      totalSprintDays
    );

    // Compute total points per day (to detect scope creep — mid-sprint additions)
    const totalPointsByDay: Record<number, number> = {};
    const burnedPointsByDay: Record<number, number> = {};

    issues.forEach((issue) => {
      const addedDay = Math.max(
        1,
        Math.round(
          (issue.createdAt.getTime() - sprintStartDate.getTime()) / msPerDay
        ) + 1
      );
      totalPointsByDay[addedDay] =
        (totalPointsByDay[addedDay] ?? 0) + issue.storyPoints;

      if (issue.closedAt) {
        const closedDay = Math.round(
          (issue.closedAt.getTime() - sprintStartDate.getTime()) / msPerDay
        ) + 1;
        if (closedDay >= 1 && closedDay <= totalSprintDays) {
          burnedPointsByDay[closedDay] =
            (burnedPointsByDay[closedDay] ?? 0) + issue.storyPoints;
        }
      }
    });

    // Starting total points = everything added on Day 1
    const initialPoints = totalPointsByDay[1] ?? 0;
    const allTotalPoints = issues.reduce((s, i) => s + i.storyPoints, 0);

    // Build cumulative actual remaining points per day
    let runningTotal = allTotalPoints;
    let runningBurned = 0;

    // Track per-day additions after day 1 (scope creep)
    const scopeCreepByDay: Record<number, number> = {};
    for (const [dayStr, pts] of Object.entries(totalPointsByDay)) {
      const day = Number(dayStr);
      if (day > 1) {
        scopeCreepByDay[day] = pts;
        runningTotal += 0; // already counted in allTotalPoints
      }
    }

    // Build data array
    const data: BurnDownDataPoint[] = [];

    // Ideal: linear from allTotalPoints → 0 over totalSprintDays
    const idealDecrement = allTotalPoints / (totalSprintDays - 1);

    let cumulativeBurned = 0;
    let scopeCumulative = 0;

    for (let day = 1; day <= totalSprintDays; day++) {
      const idealRemaining = Math.max(
        0,
        allTotalPoints - idealDecrement * (day - 1)
      );

      const burnedToday = burnedPointsByDay[day] ?? 0;
      cumulativeBurned += burnedToday;

      const scopeToday = scopeCreepByDay[day] ?? 0;
      scopeCumulative += scopeToday;

      const actualRemaining =
        day <= currentDay
          ? allTotalPoints - cumulativeBurned
          : null;

      data.push({
        day,
        ideal: Math.round(idealRemaining * 10) / 10,
        actual: actualRemaining != null ? Math.round(actualRemaining * 10) / 10 : null,
        forecast: null, // filled below
        scopeCreep: scopeToday > 0 && day > 1,
      });
    }

    // Compute rolling velocity (pts/day burned) over last N actual days
    const actualDays = data.filter((d) => d.actual != null);
    const windowSize = Math.min(5, actualDays.length - 1);
    let velocity = 0;

    if (windowSize > 0) {
      const recent = actualDays.slice(-windowSize - 1);
      const first = recent[0].actual ?? 0;
      const last = recent[recent.length - 1].actual ?? 0;
      velocity = (first - last) / windowSize;
    }

    if (velocity <= 0) velocity = 0.01; // avoid division by zero

    // Project forecast line from today onward
    const currentActual = data[currentDay - 1]?.actual ?? allTotalPoints;

    let predictedCompletionDay: number | null = null;
    for (let day = currentDay; day <= totalSprintDays + 30; day++) {
      const projected = currentActual - velocity * (day - currentDay);
      if (day <= totalSprintDays) {
        data[day - 1].forecast = Math.max(0, Math.round(projected * 10) / 10);
      }
      if (projected <= 0 && predictedCompletionDay == null) {
        predictedCompletionDay = day;
      }
    }

    const completedPoints = cumulativeBurned;
    const remainingPoints = allTotalPoints - completedPoints;
    const isDelayed =
      predictedCompletionDay != null &&
      predictedCompletionDay > totalSprintDays;

    return {
      data,
      totalPoints: allTotalPoints,
      velocity,
      predictedCompletionDay,
      isDelayed,
      completedPoints,
      remainingPoints,
    };
  }, [issues, sprintStartDate, sprintEndDate]);
}