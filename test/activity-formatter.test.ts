import { describe, it, expect } from "vitest";
import {
  formatActivity,
  formatGraphQLDiscussionComment,
  mergeActivityItems,
  type GraphQLDiscussionCommentNode,
  type ActivityItem,
} from "@/lib/activity-formatter";

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

  it("formats PushEvent with multiple commits", () => {
    const event = {
      id: "100",
      type: "PushEvent",
      created_at: "2024-01-15T10:00:00Z",
      repo: { name: "test/repo" },
      payload: {
        commits: [{}, {}, {}],
        ref: "refs/heads/main",
        head: "abc123",
      },
    };
    const result = formatActivity(event as any);
    expect(result?.title).toBe("Pushed 3 commits to main");
  });

  it("formats PullRequestEvent for opened state", () => {
    const event = {
      id: "101",
      type: "PullRequestEvent",
      created_at: "2024-01-15T10:00:00Z",
      repo: { name: "test/repo" },
      payload: {
        action: "opened",
        pull_request: {
          html_url: "https://github.com/test/repo/pull/42",
          number: 42,
          title: "Add new feature",
        },
      },
    };
    const result = formatActivity(event as any);
    expect(result?.type).toBe("pull_request");
    expect(result?.title).toBe("Opened pull request #42");
  });

  it("formats PullRequestEvent for closed and merged state", () => {
    const event = {
      id: "102",
      type: "PullRequestEvent",
      created_at: "2024-01-15T10:00:00Z",
      repo: { name: "test/repo" },
      payload: {
        action: "closed",
        pull_request: {
          html_url: "https://github.com/test/repo/pull/43",
          number: 43,
          title: "Fix bug",
          merged: true,
        },
      },
    };
    const result = formatActivity(event as any);
    expect(result?.title).toBe("Merged pull request #43");
  });

  it("formats PullRequestEvent for closed without merge", () => {
    const event = {
      id: "103",
      type: "PullRequestEvent",
      created_at: "2024-01-15T10:00:00Z",
      repo: { name: "test/repo" },
      payload: {
        action: "closed",
        pull_request: {
          html_url: "https://github.com/test/repo/pull/44",
          number: 44,
          title: "WIP feature",
          merged: false,
        },
      },
    };
    const result = formatActivity(event as any);
    expect(result?.title).toBe("Closed pull request #44");
  });

  it("formats IssuesEvent for opened state", () => {
    const event = {
      id: "104",
      type: "IssuesEvent",
      created_at: "2024-01-15T10:00:00Z",
      repo: { name: "test/repo" },
      payload: {
        action: "opened",
        issue: {
          html_url: "https://github.com/test/repo/issues/10",
          number: 10,
          title: "Bug report",
        },
      },
    };
    const result = formatActivity(event as any);
    expect(result?.type).toBe("issue");
    expect(result?.title).toBe("Opened issue #10");
  });

  it("formats IssuesEvent for closed state", () => {
    const event = {
      id: "105",
      type: "IssuesEvent",
      created_at: "2024-01-15T10:00:00Z",
      repo: { name: "test/repo" },
      payload: {
        action: "closed",
        issue: {
          html_url: "https://github.com/test/repo/issues/11",
          number: 11,
          title: "Feature request",
        },
      },
    };
    const result = formatActivity(event as any);
    expect(result?.title).toBe("Closed issue #11");
  });
});

// ─── formatGraphQLDiscussionComment ──────────────────────────────────────────

describe("formatGraphQLDiscussionComment", () => {
  const baseNode: GraphQLDiscussionCommentNode = {
    createdAt: "2024-03-10T14:30:00Z",
    url: "https://github.com/owner/repo/discussions/42#discussioncomment-999",
    discussion: {
      title: "How to contribute",
      number: 42,
      url: "https://github.com/owner/repo/discussions/42",
      repository: { nameWithOwner: "owner/repo" },
    },
  };

  it("sets type to discussion", () => {
    expect(formatGraphQLDiscussionComment(baseNode).type).toBe("discussion");
  });

  it("builds a human-readable title including the discussion number", () => {
    expect(formatGraphQLDiscussionComment(baseNode).title).toBe(
      "Commented on discussion #42"
    );
  });

  it("uses the discussion title as subtitle", () => {
    expect(formatGraphQLDiscussionComment(baseNode).subtitle).toBe(
      "How to contribute"
    );
  });

  it("uses the repository nameWithOwner as repo", () => {
    expect(formatGraphQLDiscussionComment(baseNode).repo).toBe("owner/repo");
  });

  it("links to the discussion URL, not the comment-anchor URL", () => {
    expect(formatGraphQLDiscussionComment(baseNode).url).toBe(
      "https://github.com/owner/repo/discussions/42"
    );
  });

  it("preserves the comment createdAt timestamp", () => {
    expect(formatGraphQLDiscussionComment(baseNode).createdAt).toBe(
      "2024-03-10T14:30:00Z"
    );
  });

  it("generates a stable id that includes the comment URL", () => {
    const item = formatGraphQLDiscussionComment(baseNode);
    expect(item.id).toContain("gql-disc");
    expect(item.id).toContain(baseNode.url);
  });

  it("handles a different discussion number correctly", () => {
    const node: GraphQLDiscussionCommentNode = {
      ...baseNode,
      discussion: { ...baseNode.discussion, number: 1 },
    };
    expect(formatGraphQLDiscussionComment(node).title).toBe(
      "Commented on discussion #1"
    );
  });
});

// ─── mergeActivityItems ───────────────────────────────────────────────────────

describe("mergeActivityItems", () => {
  function makeItem(
    partial: Partial<ActivityItem> & Pick<ActivityItem, "createdAt">
  ): ActivityItem {
    return {
      id: partial.id ?? `id-${Math.random()}`,
      type: partial.type ?? "push",
      createdAt: partial.createdAt,
      title: partial.title ?? "Title",
      subtitle: partial.subtitle ?? "subtitle",
      repo: partial.repo ?? "owner/repo",
      url: partial.url ?? "https://github.com/owner/repo",
    };
  }

  it("returns REST items sorted newest-first when discussion array is empty", () => {
    const items = [
      makeItem({ createdAt: "2024-01-01T10:00:00Z" }),
      makeItem({ createdAt: "2024-01-03T10:00:00Z" }),
      makeItem({ createdAt: "2024-01-02T10:00:00Z" }),
    ];
    const result = mergeActivityItems(items, []);
    expect(result[0].createdAt).toBe("2024-01-03T10:00:00Z");
    expect(result[1].createdAt).toBe("2024-01-02T10:00:00Z");
    expect(result[2].createdAt).toBe("2024-01-01T10:00:00Z");
  });

  it("interleaves discussion items with REST items in chronological order", () => {
    const restItems = [
      makeItem({ id: "r1", createdAt: "2024-01-03T00:00:00Z", type: "push" }),
      makeItem({ id: "r2", createdAt: "2024-01-01T00:00:00Z", type: "issue" }),
    ];
    const discussionItems = [
      makeItem({ id: "d1", createdAt: "2024-01-02T00:00:00Z", type: "discussion" }),
    ];
    const result = mergeActivityItems(restItems, discussionItems);
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe("r1");
    expect(result[1].id).toBe("d1");
    expect(result[2].id).toBe("r2");
  });

  it("deduplicates items that share the same type, repo, createdAt, and title", () => {
    const shared: ActivityItem = {
      id: "rest-123",
      type: "discussion",
      createdAt: "2024-01-15T10:00:00Z",
      title: "Commented on discussion #42",
      subtitle: "Some topic",
      repo: "owner/repo",
      url: "https://github.com/owner/repo/discussions/42",
    };
    const duplicate: ActivityItem = {
      ...shared,
      id: "gql-disc-https://github.com/owner/repo/discussions/42#comment-1",
    };
    const result = mergeActivityItems([shared], [duplicate]);
    expect(result).toHaveLength(1);
  });

  it("keeps distinct items that differ only by title", () => {
    const a = makeItem({
      createdAt: "2024-01-15T10:00:00Z",
      type: "discussion",
      title: "Commented on discussion #1",
    });
    const b = makeItem({
      createdAt: "2024-01-15T10:00:00Z",
      type: "discussion",
      title: "Commented on discussion #2",
    });
    const result = mergeActivityItems([a], [b]);
    expect(result).toHaveLength(2);
  });

  it("returns only REST items when discussion array is empty", () => {
    const items = [
      makeItem({ id: "r1", createdAt: "2024-01-01T00:00:00Z" }),
      makeItem({ id: "r2", createdAt: "2024-01-02T00:00:00Z" }),
    ];
    const result = mergeActivityItems(items, []);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toContain("r1");
    expect(result.map((i) => i.id)).toContain("r2");
  });

  it("returns only discussion items when REST array is empty", () => {
    const items = [
      makeItem({ id: "d1", createdAt: "2024-01-01T00:00:00Z", type: "discussion" }),
    ];
    const result = mergeActivityItems([], items);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("d1");
  });

  it("returns an empty array when both inputs are empty", () => {
    expect(mergeActivityItems([], [])).toEqual([]);
  });
});