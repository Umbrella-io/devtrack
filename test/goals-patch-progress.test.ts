import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  resolveAppUser: vi.fn(),
  from: vi.fn(),
  update: vi.fn(),
  existingGoal: {
    id: "goal-1",
    user_id: "user-1",
    title: "Ship work",
    target: 10,
    current: 2,
    unit: "tasks",
  },
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/resolve-user", () => ({
  resolveAppUser: mocks.resolveAppUser,
}));

vi.mock("@/lib/supabase", () => ({
  supabaseAdmin: {
    from: mocks.from,
  },
}));

import { PATCH } from "@/app/api/goals/[id]/route";

function createSupabaseBuilder() {
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    update: mocks.update.mockImplementation(() => builder),
    maybeSingle: vi.fn(async () => ({ data: mocks.existingGoal, error: null })),
    single: vi.fn(async () => ({
      data: { ...mocks.existingGoal, current: 4 },
      error: null,
    })),
  };

  return builder;
}

async function patchGoal(body: Record<string, unknown>) {
  const req = new Request("http://localhost/api/goals/goal-1", {
    method: "PATCH",
    body: JSON.stringify(body),
  });

  return PATCH(req, { params: { id: "goal-1" } });
}

describe("PATCH /api/goals/[id] progress updates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerSession.mockResolvedValue({
      githubId: "github-1",
      githubLogin: "octocat",
    });
    mocks.resolveAppUser.mockResolvedValue({ id: "user-1" });
    mocks.from.mockImplementation(() => createSupabaseBuilder());
    mocks.existingGoal = {
      id: "goal-1",
      user_id: "user-1",
      title: "Ship work",
      target: 10,
      current: 2,
      unit: "tasks",
    };
  });

  it("allows manual progress updates for non-GitHub goals", async () => {
    const response = await patchGoal({ current: 4 });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.goal.current).toBe(4);
    expect(mocks.update).toHaveBeenCalledWith({ current: 4 });
  });

  it.each(["commits", "prs"])(
    "rejects client-supplied progress for %s goals",
    async (unit) => {
      mocks.existingGoal = { ...mocks.existingGoal, unit };

      const response = await patchGoal({ current: 9 });
      const json = await response.json();

      expect(response.status).toBe(400);
      expect(json.error).toBe(
        "current for GitHub-synced goals can only be updated by sync"
      );
      expect(mocks.update).not.toHaveBeenCalled();
    }
  );

  it("rejects setting progress while converting a goal to a GitHub-synced unit", async () => {
    const response = await patchGoal({ unit: "commits", current: 9 });
    const json = await response.json();

    expect(response.status).toBe(400);
    expect(json.error).toBe(
      "current for GitHub-synced goals can only be updated by sync"
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
