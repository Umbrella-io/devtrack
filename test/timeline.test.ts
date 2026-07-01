import { describe, it, expect } from "vitest";
import {
  transformActivityItemToTimeline,
  filterActivities,
  groupActivities,
  type TimelineActivity,
} from "../src/lib/timeline-formatter";
import type { ActivityItem } from "../src/lib/activity-formatter";

describe("timeline-formatter utilities", () => {
  describe("transformActivityItemToTimeline", () => {
    it("correctly transforms push activities into commit timeline items", () => {
      const item: ActivityItem = {
        id: "1",
        type: "push",
        createdAt: "2026-06-19T12:00:00Z",
        title: "Pushed 1 commit to main",
        subtitle: "repo1",
        repo: "user/repo1",
        url: "https://github.com/user/repo1/commit/sha",
      };

      const result = transformActivityItemToTimeline(item);

      expect(result.type).toBe("commit");
      expect(result.id).toBe("1");
      expect(result.repository).toBe("user/repo1");
      expect(result.title).toBe("Pushed 1 commit to main");
      expect(result.url).toBe("https://github.com/user/repo1/commit/sha");
      expect(result.timestamp).toBe("2026-06-19T12:00:00Z");
      expect(result.metadata?.originalType).toBe("push");
    });

    it("correctly transforms pull_request activities", () => {
      const item: ActivityItem = {
        id: "2",
        type: "pull_request",
        createdAt: "2026-06-19T13:00:00Z",
        title: "Opened PR #5",
        subtitle: "Add timeline",
        repo: "user/repo1",
        url: "https://github.com/user/repo1/pull/5",
      };

      const result = transformActivityItemToTimeline(item);
      expect(result.type).toBe("pr");
    });

    it("correctly transforms issue and discussion activities", () => {
      const item: ActivityItem = {
        id: "3",
        type: "issue",
        createdAt: "2026-06-19T14:00:00Z",
        title: "Opened issue #10",
        subtitle: "Bug report",
        repo: "user/repo1",
        url: "https://github.com/user/repo1/issues/10",
      };

      const result1 = transformActivityItemToTimeline(item);
      expect(result1.type).toBe("issue");

      const discItem: ActivityItem = {
        id: "4",
        type: "discussion",
        createdAt: "2026-06-19T15:00:00Z",
        title: "Created discussion #2",
        subtitle: "Idea",
        repo: "user/repo1",
        url: "https://github.com/user/repo1/discussions/2",
      };

      const result2 = transformActivityItemToTimeline(discItem);
      expect(result2.type).toBe("issue");
    });

    it("correctly transforms pull request reviews", () => {
      const item: ActivityItem = {
        id: "5",
        type: "review",
        createdAt: "2026-06-19T16:00:00Z",
        title: "Reviewed PR #5",
        subtitle: "Looks good",
        repo: "user/repo1",
        url: "https://github.com/user/repo1/pull/5",
      };

      const result = transformActivityItemToTimeline(item);
      expect(result.type).toBe("review");
    });

    it("falls back to event type for watch/release/stars/other events", () => {
      const item: ActivityItem = {
        id: "6",
        type: "release",
        createdAt: "2026-06-19T17:00:00Z",
        title: "Published v1.0",
        subtitle: "Release name",
        repo: "user/repo1",
        url: "https://github.com/user/repo1/releases/tag/v1.0",
      };

      const result = transformActivityItemToTimeline(item);
      expect(result.type).toBe("event");
    });
  });

  describe("filterActivities", () => {
    const mockActivities: TimelineActivity[] = [
      {
        id: "1",
        type: "commit",
        repository: "user/repo1",
        title: "Commit 1",
        url: "url1",
        timestamp: "2026-06-19T12:00:00Z",
      },
      {
        id: "2",
        type: "pr",
        repository: "user/repo1",
        title: "PR 1",
        url: "url2",
        timestamp: "2026-06-15T12:00:00Z",
      },
      {
        id: "3",
        type: "issue",
        repository: "user/repo2",
        title: "Issue 1",
        url: "url3",
        timestamp: "2026-05-19T12:00:00Z", // 31 days ago if now is Jun 19
      },
    ];

    it("filters by category", () => {
      const commitsOnly = filterActivities(mockActivities, "commit", { preset: "90" });
      expect(commitsOnly.length).toBe(1);
      expect(commitsOnly[0].id).toBe("1");
    });

    it("filters by custom date range", () => {
      const dateFiltered = filterActivities(mockActivities, "all", {
        preset: "custom",
        startDate: "2026-06-10",
        endDate: "2026-06-17",
      });

      expect(dateFiltered.length).toBe(1);
      expect(dateFiltered[0].id).toBe("2");
    });
  });

  describe("groupActivities", () => {
    const mockActivities: TimelineActivity[] = [
      {
        id: "1",
        type: "commit",
        repository: "user/repo1",
        title: "Commit 1",
        url: "url1",
        timestamp: "2026-06-19T12:00:00Z",
      },
      {
        id: "2",
        type: "pr",
        repository: "user/repo1",
        title: "PR 1",
        url: "url2",
        timestamp: "2026-06-19T15:00:00Z",
      },
      {
        id: "3",
        type: "issue",
        repository: "user/repo2",
        title: "Issue 1",
        url: "url3",
        timestamp: "2026-05-10T12:00:00Z",
      },
    ];

    it("groups daily correctly", () => {
      const grouped = groupActivities(mockActivities, "daily");
      const keys = Object.keys(grouped);
      expect(keys.length).toBe(2);
      expect(grouped[keys[0]].length).toBe(2); // Jun 19 items
      expect(grouped[keys[1]].length).toBe(1); // May 10 item
    });

    it("groups monthly correctly", () => {
      const grouped = groupActivities(mockActivities, "monthly");
      const keys = Object.keys(grouped);
      expect(keys.length).toBe(2);
    });
  });
});
