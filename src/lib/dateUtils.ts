import { startOfWeek, subWeeks } from "date-fns";

function toUtcWallClock(date: Date): Date {
  return new Date(date.getTime() + date.getTimezoneOffset() * 60_000);
}

function fromUtcWallClock(date: Date): Date {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
}

function getUtcWeekStart(date: Date): Date {
  const utcWallClock = toUtcWallClock(date);
  const weekStart = startOfWeek(utcWallClock, { weekStartsOn: 1 });
  const utcWeekStart = fromUtcWallClock(weekStart);
  utcWeekStart.setUTCHours(0, 0, 0, 0);
  return utcWeekStart;
}

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dateDiffDays(a: string, b: string): number {
  return (new Date(b).getTime() - new Date(a).getTime()) / 86400000;
}

export function getThisWeekRange(): { start: string; end: string } {
  const now = new Date();
  const weekStart = getUtcWeekStart(now);
  const end = new Date(now);
  end.setUTCHours(23, 59, 59, 0);

  return {
    start: weekStart.toISOString(),
    end: end.toISOString(),
  };
}

export function getLastWeekRange(): { start: string; end: string } {
  const thisWeekStart = getUtcWeekStart(new Date());
  const lastWeekStart = subWeeks(thisWeekStart, 1);
  lastWeekStart.setUTCHours(0, 0, 0, 0);
  const lastWeekEnd = new Date(thisWeekStart);
  lastWeekEnd.setUTCDate(lastWeekEnd.getUTCDate() - 1);
  lastWeekEnd.setUTCHours(23, 59, 59, 0);

  return {
    start: lastWeekStart.toISOString(),
    end: lastWeekEnd.toISOString(),
  };
}
