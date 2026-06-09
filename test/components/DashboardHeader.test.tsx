import React from "react";
import "@testing-library/jest-dom/vitest";
// @ts-ignore
import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import DashboardHeader from "../../src/components/DashboardHeader";
import { useSession } from "next-auth/react";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/en.json";

vi.mock("next-auth/react");

vi.mock("@/components/NotificationBell", () => ({
  default: () => <div>NotificationBell</div>,
}));

vi.mock("@/components/AccountToggle", () => ({
  default: () => <div>AccountToggle</div>,
}));

vi.mock("@/components/SignOutButton", () => ({
  default: () => <div>SignOutButton</div>,
}));

vi.mock("@/components/ThemeToggle", () => ({
  default: () => <div>ThemeToggle</div>,
}));

vi.mock("@/components/UserAvatar", () => ({
  default: () => <div>UserAvatar</div>,
}));

vi.mock("@/components/KeyboardShortcuts", () => ({
  default: () => <div>KeyboardShortcuts</div>,
}));

const mockedUseSession = useSession as any;

function renderDashboardHeader() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <DashboardHeader />
    </NextIntlClientProvider>
  );
}

describe("DashboardHeader", () => {
  beforeEach(() => {
    global.fetch = vi.fn() as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders Dashboard heading", () => {
    mockedUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    renderDashboardHeader();

    expect(
      screen.getByRole("heading", { name: "Dashboard" })
    ).toBeInTheDocument();
  });

  it("renders subtitle text", () => {
    mockedUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    renderDashboardHeader();

    expect(
      screen.getByText(/coding activity at a glance/i)
    ).toBeInTheDocument();
  });

  it("does not fetch settings when session is null", () => {
    mockedUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
    });

    renderDashboardHeader();

    expect(fetch).not.toHaveBeenCalled();
  });

  it("fetches user settings on mount when session exists", async () => {
    mockedUseSession.mockReturnValue({
      data: {
        githubLogin: "testuser",
      },
      status: "authenticated",
    });

    (fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        is_public: true,
      }),
    });

    renderDashboardHeader();

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/user/settings");
    });
  });
});
