import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendDiscordWebhook, sendTestNotification, sendStreakAtRisk, sendMilestoneReached, sendWeeklySummary } from "../src/lib/discord";

describe("sendDiscordWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when fetch succeeds", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendDiscordWebhook("https://webhook.url", { test: "payload" });
    expect(result).toBe(true);
  });

  it("throws error when fetch fails", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: false, status: 400, statusText: "Bad Request" });
    vi.stubGlobal("fetch", mockFetch);

    await expect(sendDiscordWebhook("https://webhook.url", { test: "payload" })).rejects.toThrow("Discord Webhook failed: 400 Bad Request");
  });
});

describe("sendTestNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends test notification successfully", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendTestNotification("https://webhook.url", "testuser");
    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith("https://webhook.url", expect.objectContaining({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }));
  });
});

describe("sendStreakAtRisk", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends streak at risk notification", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendStreakAtRisk("https://webhook.url", "testuser", 5);
    expect(result).toBe(true);
  });
});

describe("sendMilestoneReached", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends milestone notification", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendMilestoneReached("https://webhook.url", "testuser", 30);
    expect(result).toBe(true);
  });
});

describe("sendWeeklySummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends weekly summary notification", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", mockFetch);

    const result = await sendWeeklySummary("https://webhook.url", "testuser", { commits: 10, prs: 3, activeDays: 5 });
    expect(result).toBe(true);
  });
});
