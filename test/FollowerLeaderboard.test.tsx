import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import React from "react";

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    React.createElement("img", { src, alt }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => React.createElement("a", { href, ...rest }, children),
}));

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makePayload(
  metric = "streak",
  entries: Array<{
    username: string;
    streak: number;
    commitsThisMonth: number;
    mergedPullRequests: number;
  }> = []
) {
  return {
    generatedAt: new Date().toISOString(),
    metric,
    entries: entries.map((e, i) => ({
      rank: i + 1,
      username: e.username,
      avatarUrl: `https://github.com/${e.username}.png`,
      profileUrl: `https://github.com/${e.username}`,
      streak: e.streak,
      commitsThisMonth: e.commitsThisMonth,
      mergedPullRequests: e.mergedPullRequests,
    })),
  };
}

function mockFetchSuccess(data: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
      headers: new Headers(),
    } as Response)
  );
}

function mockFetchError(status: number, body: unknown = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve(body),
      headers: new Headers({ "Retry-After": "30" }),
    } as Response)
  );
}

// Import the component under test AFTER mocks are set up.
// eslint-disable-next-line import/order
import FollowerLeaderboard from "@/components/leaderboard/FollowerLeaderboard";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("FollowerLeaderboard", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  // ── Loading state ────────────────────────────────────────────────────────────
  describe("loading state", () => {
    it("renders the loading skeleton before data arrives", async () => {
      let resolve!: (v: unknown) => void;
      const pending = new Promise((r) => (resolve = r));
      vi.stubGlobal(
        "fetch",
        vi.fn().mockReturnValue(pending)
      );

      const { container } = render(React.createElement(FollowerLeaderboard));
      expect(container.querySelector('[role="status"]')).not.toBeNull();
      resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makePayload()),
        headers: new Headers(),
      });
    });
  });

  // ── Empty state ───────────────────────────────────────────────────────────────
  describe("empty state", () => {
    it("shows the no-followers message when entries is empty", async () => {
      mockFetchSuccess(makePayload("streak", []));
      render(React.createElement(FollowerLeaderboard));
      await waitFor(() => {
        expect(screen.getByText(/no followers found/i)).toBeTruthy();
      });
    });

    it("does not render a table row for zero followers", async () => {
      mockFetchSuccess(makePayload("streak", []));
      const { container } = render(React.createElement(FollowerLeaderboard));
      await waitFor(() => {
        expect(container.querySelector("tbody")).toBeNull();
      });
    });
  });

  // ── Rendering ─────────────────────────────────────────────────────────────────
  describe("leaderboard rendering", () => {
    it("renders one row per follower", async () => {
      const entries = [
        { username: "alice", streak: 5, commitsThisMonth: 10, mergedPullRequests: 2 },
        { username: "bob", streak: 3, commitsThisMonth: 4, mergedPullRequests: 0 },
      ];
      mockFetchSuccess(makePayload("streak", entries));

      render(React.createElement(FollowerLeaderboard));
      await waitFor(() => {
        expect(screen.getByText("@alice")).toBeTruthy();
        expect(screen.getByText("@bob")).toBeTruthy();
      });
    });

    it("displays rank 1 for the top entry", async () => {
      mockFetchSuccess(
        makePayload("streak", [
          { username: "alice", streak: 7, commitsThisMonth: 5, mergedPullRequests: 1 },
        ])
      );

      render(React.createElement(FollowerLeaderboard));
      await waitFor(() => {
        expect(screen.getByRole("img", { name: /rank 1/i })).toBeTruthy();
      });
    });

    it("renders avatar images with correct alt text", async () => {
      mockFetchSuccess(
        makePayload("streak", [
          { username: "alice", streak: 3, commitsThisMonth: 5, mergedPullRequests: 0 },
        ])
      );

      render(React.createElement(FollowerLeaderboard));
      await waitFor(() => {
        expect(screen.getByAltText("alice avatar")).toBeTruthy();
      });
    });

    it("shows GitHub profile links", async () => {
      mockFetchSuccess(
        makePayload("streak", [
          { username: "alice", streak: 3, commitsThisMonth: 5, mergedPullRequests: 0 },
        ])
      );

      render(React.createElement(FollowerLeaderboard));
      await waitFor(() => {
        const link = screen.getByRole("link", { name: /view alice on github/i });
        expect(link.getAttribute("href")).toContain("alice");
      });
    });
  });

  // ── Sort controls ─────────────────────────────────────────────────────────────
  describe("sort controls", () => {
    beforeEach(() => {
      mockFetchSuccess(makePayload("streak", []));
    });

    it("renders all three sort buttons", async () => {
      render(React.createElement(FollowerLeaderboard));
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /streak/i })).toBeTruthy();
        expect(screen.getByRole("button", { name: /commits/i })).toBeTruthy();
        expect(screen.getByRole("button", { name: /prs merged/i })).toBeTruthy();
      });
    });

    it("streak button is pressed by default", async () => {
      render(React.createElement(FollowerLeaderboard));
      await waitFor(() => {
        const btn = screen.getByRole("button", { name: /streak/i });
        expect(btn.getAttribute("aria-pressed")).toBe("true");
      });
    });

    it("clicking commits triggers a new fetch with sort=commits", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makePayload("commits", [])),
        headers: new Headers(),
      } as Response);
      vi.stubGlobal("fetch", fetchMock);

      render(React.createElement(FollowerLeaderboard));
      await waitFor(() => screen.getByRole("button", { name: /commits/i }));

      fireEvent.click(screen.getByRole("button", { name: /commits/i }));

      await waitFor(() => {
        const urls = fetchMock.mock.calls.map((c) => String(c[0]));
        expect(urls.some((u) => u.includes("sort=commits"))).toBe(true);
      });
    });

    it("clicking prs triggers a new fetch with sort=prs", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makePayload("prs", [])),
        headers: new Headers(),
      } as Response);
      vi.stubGlobal("fetch", fetchMock);

      render(React.createElement(FollowerLeaderboard));
      await waitFor(() => screen.getByRole("button", { name: /prs merged/i }));

      fireEvent.click(screen.getByRole("button", { name: /prs merged/i }));

      await waitFor(() => {
        const urls = fetchMock.mock.calls.map((c) => String(c[0]));
        expect(urls.some((u) => u.includes("sort=prs"))).toBe(true);
      });
    });
  });

  // ── Error states ──────────────────────────────────────────────────────────────
  describe("error state", () => {
    it("shows an error message on 500", async () => {
      mockFetchError(500, { error: "Internal error" });
      render(React.createElement(FollowerLeaderboard));
      await waitFor(() => {
        expect(screen.getByText(/failed to load follower leaderboard/i)).toBeTruthy();
      });
    });

    it("shows rate limit message and retry timer on 429", async () => {
      mockFetchError(429, { error: "Too many requests" });
      render(React.createElement(FollowerLeaderboard));
      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeTruthy();
      });
    });

    it("shows retry button on generic error", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
      render(React.createElement(FollowerLeaderboard));
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /retry/i })).toBeTruthy();
      });
    });

    it("clicking retry re-fetches data", async () => {
      const fetchMock = vi
        .fn()
        .mockRejectedValueOnce(new Error("network"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(makePayload("streak", [])),
          headers: new Headers(),
        } as Response);
      vi.stubGlobal("fetch", fetchMock);

      render(React.createElement(FollowerLeaderboard));
      await waitFor(() => screen.getByRole("button", { name: /retry/i }));

      fireEvent.click(screen.getByRole("button", { name: /retry/i }));

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledTimes(2);
      });
    });
  });

  // ── Ranking display ───────────────────────────────────────────────────────────
  describe("ranking display", () => {
    it("shows medal icons for top 3", async () => {
      const entries = [
        { username: "gold", streak: 10, commitsThisMonth: 5, mergedPullRequests: 2 },
        { username: "silver", streak: 8, commitsThisMonth: 4, mergedPullRequests: 1 },
        { username: "bronze", streak: 6, commitsThisMonth: 3, mergedPullRequests: 0 },
        { username: "fourth", streak: 4, commitsThisMonth: 2, mergedPullRequests: 0 },
      ];
      mockFetchSuccess(makePayload("streak", entries));

      render(React.createElement(FollowerLeaderboard));
      await waitFor(() => {
        expect(screen.getByRole("img", { name: "Rank 1" })).toBeTruthy();
        expect(screen.getByRole("img", { name: "Rank 2" })).toBeTruthy();
        expect(screen.getByRole("img", { name: "Rank 3" })).toBeTruthy();
        expect(screen.queryByRole("img", { name: "Rank 4" })).toBeNull();
      });
    });

    it("shows #N for ranks beyond 3", async () => {
      const entries = Array.from({ length: 4 }, (_, i) => ({
        username: `user${i}`,
        streak: 10 - i,
        commitsThisMonth: 5,
        mergedPullRequests: 0,
      }));
      mockFetchSuccess(makePayload("streak", entries));

      render(React.createElement(FollowerLeaderboard));
      await waitFor(() => {
        expect(screen.getByText("#4")).toBeTruthy();
      });
    });
  });
});
