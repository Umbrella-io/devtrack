import { describe, it, expect } from "vitest";
import { formatActivity } from "@/lib/activity-formatter";
describe("formatActivity", () => {
  it("formats PushEvent with 1 commit", () => {
    const event = {
  type: "PushEvent",
  repo: {
    name: "test/repo",
  },
  payload: {
    commits: [{}],
    ref: "refs/heads/main",
  },
};
const result = formatActivity(event as any);

expect(result?.title).toBe("Pushed 1 commit to main");

  });
});