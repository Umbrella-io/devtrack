export function getGoalProgressPercent(current: number, target: number) {
  if (!Number.isFinite(current) || !Number.isFinite(target) || target <= 0) {
    return 0;
  }

  if (!target || target <= 0) return 0; const raw = (current / target) * 100; if (raw <= 0) return 0; if (raw < 1) return 1; return Math.min(Math.round(raw), 100);
}

export function buildPublicGoalSharePath(username: string, goalId: string) {
  return `/u/${encodeURIComponent(username)}/goals/${encodeURIComponent(
    goalId
  )}`;
}

export function buildPublicGoalShareUrl(
  origin: string,
  username: string,
  goalId: string
) {
  return `${origin}${buildPublicGoalSharePath(username, goalId)}`;
}
