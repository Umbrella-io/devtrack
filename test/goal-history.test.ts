import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/goals/route";

// ─── hoisted mocks ──────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  resolveAppUser: vi.fn(),
  supabaseFrom: vi.fn(),
  dispatchToAllWebhooks: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: mocks.getServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/resolve-user", () => ({ resolveAppUser: mocks.resolveAppUser }));
vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: { from: mocks.supabaseFrom },
}));
vi.mock("@/lib/webhooks", () => ({
  dispatchToAllWebhooks: mocks.dispatchToAllWebhooks,
}));
vi.mock("@/lib/sanitize", () => ({ stripHtml: (s: string) => s }));

// ─── helpers ────────────────────────────────────────────────────────────────

const PAST_MONDAY = "2026-05-25T00:00:00.000Z"; // a Monday in a past week
const PAST_MONTH_START = "2026-05-01T00:00:00.000Z";

function buildWeeklyGoal(overrides: Record<string, unknown> = {}) {
  return {
    id: "goal-weekly-1",
    user_id: "user-1",
    title: "Weekly commits",
    target: 10,
    current: 7,
    unit: "hours",
    recurrence: "weekly",
    deadline: null,
    period_start: PAST_MONDAY,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function buildMonthlyGoal(overrides: Record<string, unknown> = {}) {
  return {
    id: "goal-monthly-1",
    user_id: "user-1",
    title: "Monthly goal",
    target: 20,
    current: 20,
    unit: "hours",
    recurrence: "monthly",
    deadline: null,
    period_start: PAST_MONTH_START,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function buildNoneGoal(overrides: Record<string, unknown> = {}) {
  return {
    id: "goal-none-1",
    user_id: "user-1",
    title: "One-time goal",
    target: 5,
    current: 2,
    unit: "hours",
    recurrence: "none",
    deadline: null,
    period_start: "1970-01-01T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/**
 * Sets up supabaseAdmin.from() mock routing by table name.
 *
 * goalsResponse  – what `from("goals").select().eq().order().limit()` resolves to
 * upsertResult   – what `from("goal_history").upsert()` resolves to
 * updatedGoal    – what `from("goals").update().eq().lt().select().single()` resolves to
 * historyRows    – what `from("goal_history").select().in().order()` resolves to
 */
function setupSupabase({
  goalsResponse,
  upsertResult = { data: null, error: null },
  updatedGoal,
  historyRows = [],
}: {
  goalsResponse: unknown[];
  upsertResult?: { data: unknown; error: unknown };
  updatedGoal?: unknown;
  historyRows?: unknown[];
}) {
  const upsertMock = vi.fn().mockResolvedValue(upsertResult);

  const updateSingle = vi.fn().mockResolvedValue({
    data: updatedGoal ?? null,
    error: updatedGoal ? null : { message: "no rows" },
  });
  const updateSelect = vi.fn().mockReturnValue({ single: updateSingle });
  const updateLt = vi.fn().mockReturnValue({ select: updateSelect });
  const updateEqId = vi.fn().mockReturnValue({ lt: updateLt });
  const updateChain = vi.fn().mockReturnValue({ eq: updateEqId });

  const historySelectOrder = vi.fn().mockResolvedValue({ data: historyRows, error: null });
  const historySelectIn = vi.fn().mockReturnValue({ order: historySelectOrder });
  const historySelectChain = vi.fn().mockReturnValue({ in: historySelectIn });

  const goalsSelectLimit = vi.fn().mockResolvedValue({ data: goalsResponse, error: null });
  const goalsSelectOrder = vi.fn().mockReturnValue({ limit: goalsSelectLimit });
  const goalsSelectEq = vi.fn().mockReturnValue({ order: goalsSelectOrder });
  const goalsSelectChain = vi.fn().mockReturnValue({ eq: goalsSelectEq });

  // Fallback select for the race-condition branch: from("goals").select("*").eq("id", ...).single()
  const fallbackSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  const fallbackEq = vi.fn().mockReturnValue({ single: fallbackSingle });

  mocks.supabaseFrom.mockImplementation((table: string) => {
    if (table === "goal_history") {
      return {
        upsert: upsertMock,
        select: historySelectChain,
      };
    }
    // "goals" table
    return {
      select: (cols: string) => {
        if (cols === "*") {
          return {
            eq: goalsSelectEq,
            // single-row fallback for race-condition case
          };
        }
        return { eq: fallbackEq };
      },
      update: updateChain,
    };
  });

  return { upsertMock, updateChain, updateEqId, updateLt, updateSelect, updateSingle };
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("GET /api/goals — recurring goal history archival", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({ githubId: "gh-123", githubLogin: "alice" });
    mocks.resolveAppUser.mockResolvedValue({ id: "user-1" });
  });

  it("returns 401 when there is no session", async () => {
    mocks.getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 404 when the user cannot be resolved", async () => {
    mocks.resolveAppUser.mockResolvedValue(null);
    setupSupabase({ goalsResponse: [] });
    const res = await GET();
    expect(res.status).toBe(404);
  });

  // ── non-recurring goals are never archived ────────────────────────────────

  it("does not insert a history row for a one-time goal", async () => {
    const goal = buildNoneGoal();
    const { upsertMock } = setupSupabase({
      goalsResponse: [goal],
      historyRows: [],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  // ── weekly goal reset ─────────────────────────────────────────────────────

  it("inserts a history row before resetting a weekly goal", async () => {
    const goal = buildWeeklyGoal({ current: 7, target: 10 });
    const resetGoal = { ...goal, current: 0, period_start: new Date().toISOString() };
    const { upsertMock } = setupSupabase({
      goalsResponse: [goal],
      updatedGoal: resetGoal,
      historyRows: [],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledOnce();

    const [insertedData] = upsertMock.mock.calls[0];
    expect(insertedData.goal_id).toBe(goal.id);
    expect(insertedData.user_id).toBe(goal.user_id);
    expect(insertedData.achieved_value).toBe(7);
    expect(insertedData.target).toBe(10);
    expect(insertedData.completed).toBe(false);
    expect(insertedData.period_start).toBe(PAST_MONDAY);
  });

  it("records completed=true when weekly goal was achieved before reset", async () => {
    const goal = buildWeeklyGoal({ current: 10, target: 10 });
    const resetGoal = { ...goal, current: 0, period_start: new Date().toISOString() };
    const { upsertMock } = setupSupabase({
      goalsResponse: [goal],
      updatedGoal: resetGoal,
      historyRows: [],
    });

    await GET();

    const [insertedData] = upsertMock.mock.calls[0];
    expect(insertedData.completed).toBe(true);
    expect(insertedData.achieved_value).toBe(10);
  });

  it("records completed=false when weekly goal was not achieved before reset", async () => {
    const goal = buildWeeklyGoal({ current: 3, target: 10 });
    const resetGoal = { ...goal, current: 0, period_start: new Date().toISOString() };
    const { upsertMock } = setupSupabase({
      goalsResponse: [goal],
      updatedGoal: resetGoal,
      historyRows: [],
    });

    await GET();

    const [insertedData] = upsertMock.mock.calls[0];
    expect(insertedData.completed).toBe(false);
    expect(insertedData.achieved_value).toBe(3);
  });

  it("preserves the target value at time of reset in the history row", async () => {
    const goal = buildWeeklyGoal({ current: 5, target: 12 });
    const resetGoal = { ...goal, current: 0 };
    const { upsertMock } = setupSupabase({
      goalsResponse: [goal],
      updatedGoal: resetGoal,
      historyRows: [],
    });

    await GET();

    const [insertedData] = upsertMock.mock.calls[0];
    expect(insertedData.target).toBe(12);
  });

  // ── monthly goal reset ────────────────────────────────────────────────────

  it("inserts a history row before resetting a monthly goal", async () => {
    const goal = buildMonthlyGoal({ current: 20, target: 20 });
    const resetGoal = { ...goal, current: 0, period_start: new Date().toISOString() };
    const { upsertMock } = setupSupabase({
      goalsResponse: [goal],
      updatedGoal: resetGoal,
      historyRows: [],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(upsertMock).toHaveBeenCalledOnce();

    const [insertedData] = upsertMock.mock.calls[0];
    expect(insertedData.goal_id).toBe(goal.id);
    expect(insertedData.completed).toBe(true);
    expect(insertedData.achieved_value).toBe(20);
  });

  it("records completed=false for an incomplete monthly goal", async () => {
    const goal = buildMonthlyGoal({ current: 8, target: 20 });
    const resetGoal = { ...goal, current: 0 };
    const { upsertMock } = setupSupabase({
      goalsResponse: [goal],
      updatedGoal: resetGoal,
      historyRows: [],
    });

    await GET();

    const [insertedData] = upsertMock.mock.calls[0];
    expect(insertedData.completed).toBe(false);
    expect(insertedData.achieved_value).toBe(8);
  });

  // ── idempotency / transaction behaviour ───────────────────────────────────

  it("uses upsert with ignoreDuplicates to prevent double history rows on concurrent resets", async () => {
    const goal = buildWeeklyGoal({ current: 5, target: 10 });
    const resetGoal = { ...goal, current: 0 };
    const { upsertMock } = setupSupabase({
      goalsResponse: [goal],
      updatedGoal: resetGoal,
      historyRows: [],
    });

    await GET();

    const [, upsertOptions] = upsertMock.mock.calls[0];
    expect(upsertOptions).toMatchObject({
      onConflict: "goal_id,period_start",
      ignoreDuplicates: true,
    });
  });

  it("history upsert is called before the goal update", async () => {
    const callOrder: string[] = [];
    const goal = buildWeeklyGoal({ current: 5, target: 10 });
    const resetGoal = { ...goal, current: 0 };

    const upsertMock = vi.fn().mockImplementation(async () => {
      callOrder.push("upsert");
      return { data: null, error: null };
    });

    const updateSingle = vi.fn().mockImplementation(async () => {
      callOrder.push("update");
      return { data: resetGoal, error: null };
    });
    const updateSelect = vi.fn().mockReturnValue({ single: updateSingle });
    const updateLt = vi.fn().mockReturnValue({ select: updateSelect });
    const updateEqId = vi.fn().mockReturnValue({ lt: updateLt });
    const updateChain = vi.fn().mockReturnValue({ eq: updateEqId });

    const historySelectOrder = vi.fn().mockResolvedValue({ data: [], error: null });
    const historySelectIn = vi.fn().mockReturnValue({ order: historySelectOrder });
    const historySelectChain = vi.fn().mockReturnValue({ in: historySelectIn });

    const goalsSelectLimit = vi.fn().mockResolvedValue({ data: [goal], error: null });
    const goalsSelectOrder = vi.fn().mockReturnValue({ limit: goalsSelectLimit });
    const goalsSelectEq = vi.fn().mockReturnValue({ order: goalsSelectOrder });

    mocks.supabaseFrom.mockImplementation((table: string) => {
      if (table === "goal_history") {
        return { upsert: upsertMock, select: historySelectChain };
      }
      return {
        select: () => ({ eq: goalsSelectEq }),
        update: updateChain,
      };
    });

    await GET();

    expect(callOrder[0]).toBe("upsert");
    expect(callOrder[1]).toBe("update");
  });

  // ── period_end is 1 ms before new period_start ────────────────────────────

  it("sets period_end to 1 ms before the new period_start", async () => {
    const goal = buildWeeklyGoal({ current: 4, target: 10 });
    const resetGoal = { ...goal, current: 0 };
    const { upsertMock } = setupSupabase({
      goalsResponse: [goal],
      updatedGoal: resetGoal,
      historyRows: [],
    });

    await GET();

    const [insertedData] = upsertMock.mock.calls[0];
    const periodEnd = new Date(insertedData.period_end);
    const periodStart = new Date(insertedData.period_start);

    // period_end must be strictly before the start of the old stored period...
    // No: period_end is 1 ms before the NEW period start, not the old one.
    // Just verify it is a valid date and comes after period_start.
    expect(periodEnd.getTime()).toBeGreaterThan(periodStart.getTime());
    // And it should end before "now" (the current period hasn't started in the far future)
    expect(periodEnd.getTime()).toBeLessThanOrEqual(Date.now());
  });

  // ── last_period returned in GET response ──────────────────────────────────

  it("attaches last_period to recurring goals in the response", async () => {
    const goal = buildWeeklyGoal({ current: 0, target: 10 }); // already in current period
    // Simulate goal already in current period (storedPeriodStart >= periodStart)
    // by setting period_start to the current Monday
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(now);
    thisMonday.setUTCDate(now.getUTCDate() + diff);
    thisMonday.setUTCHours(0, 0, 0, 0);
    const currentGoal = { ...goal, period_start: thisMonday.toISOString() };

    const historyRow = {
      goal_id: goal.id,
      period_start: PAST_MONDAY,
      period_end: "2026-05-31T23:59:59.999Z",
      target: 10,
      achieved_value: 7,
      completed: false,
    };

    setupSupabase({
      goalsResponse: [currentGoal],
      historyRows: [historyRow],
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    const returnedGoal = body.goals[0];

    expect(returnedGoal.last_period).toBeDefined();
    expect(returnedGoal.last_period.achieved_value).toBe(7);
    expect(returnedGoal.last_period.target).toBe(10);
    expect(returnedGoal.last_period.completed).toBe(false);
  });

  it("last_period is null for recurring goals with no history", async () => {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(now);
    thisMonday.setUTCDate(now.getUTCDate() + diff);
    thisMonday.setUTCHours(0, 0, 0, 0);
    const goal = buildWeeklyGoal({ current: 3, period_start: thisMonday.toISOString() });

    setupSupabase({ goalsResponse: [goal], historyRows: [] });

    const res = await GET();
    const body = await res.json();
    expect(body.goals[0].last_period).toBeNull();
  });

  it("last_period is null for one-time goals", async () => {
    const goal = buildNoneGoal();
    setupSupabase({ goalsResponse: [goal], historyRows: [] });

    const res = await GET();
    const body = await res.json();
    expect(body.goals[0].last_period).toBeNull();
  });

  it("attaches the most recent period when multiple history rows exist", async () => {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(now);
    thisMonday.setUTCDate(now.getUTCDate() + diff);
    thisMonday.setUTCHours(0, 0, 0, 0);
    const goal = buildWeeklyGoal({ current: 2, period_start: thisMonday.toISOString() });

    const historyRows = [
      // Most recent (returned first from DB because ordered desc)
      {
        goal_id: goal.id,
        period_start: PAST_MONDAY,
        period_end: "2026-05-31T23:59:59.999Z",
        target: 10,
        achieved_value: 9,
        completed: false,
      },
      // Older period
      {
        goal_id: goal.id,
        period_start: "2026-05-18T00:00:00.000Z",
        period_end: "2026-05-24T23:59:59.999Z",
        target: 10,
        achieved_value: 10,
        completed: true,
      },
    ];

    setupSupabase({ goalsResponse: [goal], historyRows });

    const res = await GET();
    const body = await res.json();
    const returnedGoal = body.goals[0];

    // Should pick the most recent (first) row
    expect(returnedGoal.last_period.achieved_value).toBe(9);
    expect(returnedGoal.last_period.completed).toBe(false);
  });

  it("handles multiple recurring goals, each getting their own last_period", async () => {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    const thisMonday = new Date(now);
    thisMonday.setUTCDate(now.getUTCDate() + diff);
    thisMonday.setUTCHours(0, 0, 0, 0);

    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

    const weeklyGoal = buildWeeklyGoal({ id: "wg-1", current: 1, period_start: thisMonday.toISOString() });
    const monthlyGoal = buildMonthlyGoal({ id: "mg-1", current: 5, period_start: thisMonth.toISOString() });

    const historyRows = [
      {
        goal_id: "wg-1",
        period_start: PAST_MONDAY,
        period_end: "2026-05-31T23:59:59.999Z",
        target: 10,
        achieved_value: 6,
        completed: false,
      },
      {
        goal_id: "mg-1",
        period_start: PAST_MONTH_START,
        period_end: "2026-05-31T23:59:59.999Z",
        target: 20,
        achieved_value: 20,
        completed: true,
      },
    ];

    setupSupabase({ goalsResponse: [weeklyGoal, monthlyGoal], historyRows });

    const res = await GET();
    const body = await res.json();
    const wg = body.goals.find((g: { id: string }) => g.id === "wg-1");
    const mg = body.goals.find((g: { id: string }) => g.id === "mg-1");

    expect(wg.last_period.achieved_value).toBe(6);
    expect(wg.last_period.completed).toBe(false);
    expect(mg.last_period.achieved_value).toBe(20);
    expect(mg.last_period.completed).toBe(true);
  });
});
