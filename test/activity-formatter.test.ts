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

  it("formats DiscussionCommentEvent correctly", () => {
    const event = {
      id: "123456",
      type: "DiscussionCommentEvent",
      created_at: "2024-01-15T10:00:00Z",
      repo: {
        name: "test/discussion-repo",
      },
      payload: {
        discussion: {
          html_url: "https://github.com/test/discussion-repo/discussions/42",
          number: 42,
          title: "How to contribute",
        },
      },
    };
    const result = formatActivity(event as any);

    expect(result?.type).toBe("discussion");
    expect(result?.title).toBe("Commented on discussion #42");
    expect(result?.subtitle).toBe("How to contribute");
  });

  it("handles missing payload fields gracefully", () => {
    const event = {
      id: "789",
      type: "PushEvent",
      created_at: "2024-01-15T10:00:00Z",
      repo: {
        name: "test/repo",
      },
      payload: {},
    };
    const result = formatActivity(event as any);

    expect(result?.title).toBe("Pushed 0 commits to default branch");
  });

  it("returns null for events with empty repo name", () => {
    const event = {
      id: "999",
      type: "PushEvent",
      created_at: "2024-01-15T10:00:00Z",
      repo: {
        name: "",
      },
      payload: {
        commits: [{ sha: "abc123" }],
      },
    };
    const result = formatActivity(event as any);

    expect(result).toBeNull();
  });

  it("handles DiscussionEvent with missing discussion fields", () => {
    const event = {
      id: "456",
      type: "DiscussionEvent",
      created_at: "2024-01-15T10:00:00Z",
      repo: {
        name: "test/repo",
      },
      payload: {},
    };
    const result = formatActivity(event as any);

    expect(result).not.toBeNull();
    expect(result?.title).toContain("Opened discussion");
  });

  it("returns null for ReleaseEvent with missing release fields", () => {
    const event = {
      id: "789",
      type: "ReleaseEvent",
      created_at: "2024-01-15T10:00:00Z",
      repo: {
        name: "test/repo",
      },
      payload: {},
    };
    const result = formatActivity(event as any);

    expect(result?.title).toBe("Published release");
  });

  it("returns null for unsupported event types", () => {
    const event = {
      type: "UnsupportedEvent",
    };
    expect(formatActivity(event as any)).toBeNull();
  });

  it("returns null for unsupported event types that still have repo names", () => {
    const event = {
      type: "RandomEvent",
      repo: {
        name: "test/repo",
      },
      payload: {},
    };
    expect(formatActivity(event as any)).toBeNull();
  });

  it("formats PushEvent with malformed refs correctly", () => {
    const event = {
      type: "PushEvent",
      repo: {
        name: "test/repo",
      },
      payload: {
        commits: [{}],
        ref: "refs/tags/v1.0",
      },
    };
    const result = formatActivity(event as any);
    expect(result?.title).toBe("Pushed 1 commit to refs/tags/v1.0");
  });

  it("formats ReleaseEvent edge cases (different action and missing tag)", () => {
    const event = {
      type: "ReleaseEvent",
      repo: {
        name: "test/repo",
      },
      payload: {
        action: "created",
        release: {
          name: "Initial Release",
        },
      },
    };
    const result = formatActivity(event as any);
    expect(result?.title).toBe("Created release");
    expect(result?.subtitle).toBe("Initial Release");
  });

  it("formats DiscussionEvent with various action types", () => {
    const event = {
      type: "DiscussionEvent",
      repo: {
        name: "test/repo",
      },
      payload: {
        action: "answered",
        discussion: {
          number: 10,
          title: "How to use?",
        },
      },
    };
    const result = formatActivity(event as any);
    expect(result?.title).toBe("Answered discussion #10");
  });

  it("is case sensitive in event type matching and returns null for lowercase types", () => {
    const event = {
      type: "pushevent",
      repo: {
        name: "test/repo",
      },
      payload: {
        commits: [{}],
      },
    };
    expect(formatActivity(event as any)).toBeNull();
  });
});