import { beforeEach, describe, expect, it, vi } from "vitest";

import { submitGoalWithRefresh, type CreateGoalPayload } from "@/lib/goal-tracker";

const payload: CreateGoalPayload = {
  title: "Ship more fixes",
  target: 5,
  unit: "commits",
  recurrence: "none",
  deadline: null,
};

describe("submitGoalWithRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns a create error when the POST request fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false });
    const handleSync = vi.fn();
    const loadGoals = vi.fn();

    const result = await submitGoalWithRefresh({
      fetchImpl,
      payload,
      handleSync,
      loadGoals,
    });

    expect(result).toEqual({
      created: false,
      error: "Failed to create goal. Please try again.",
    });
    expect(handleSync).not.toHaveBeenCalled();
    expect(loadGoals).not.toHaveBeenCalled();
  });

  it("keeps the goal created and returns a refresh error when sync fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const handleSync = vi.fn().mockRejectedValue(new Error("sync failed"));
    const loadGoals = vi.fn();

    const result = await submitGoalWithRefresh({
      fetchImpl,
      payload,
      handleSync,
      loadGoals,
    });

    expect(result).toEqual({
      created: true,
      error: "Goal created, but refreshing goals failed. Please try refreshing.",
    });
    expect(handleSync).toHaveBeenCalledTimes(1);
    expect(loadGoals).not.toHaveBeenCalled();
  });

  it("reloads goals for non auto-synced units", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true });
    const handleSync = vi.fn();
    const loadGoals = vi.fn().mockResolvedValue(undefined);

    const result = await submitGoalWithRefresh({
      fetchImpl,
      payload: { ...payload, unit: "hours" },
      handleSync,
      loadGoals,
    });

    expect(result).toEqual({
      created: true,
      error: null,
    });
    expect(handleSync).not.toHaveBeenCalled();
    expect(loadGoals).toHaveBeenCalledTimes(1);
  });
});
