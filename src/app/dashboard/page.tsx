"use client";

import { useEffect } from "react";
import ContributionGraph from "@/components/ContributionGraph";
import PRMetrics from "@/components/PRMetrics";
import GoalTracker from "@/components/GoalTracker";
import DashboardHeader from "@/components/DashboardHeader";
import StreakTracker from "@/components/StreakTracker";
import TopRepos from "@/components/TopRepos";

export default function DashboardPage() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;

      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (event.key.toLowerCase() === "d") {
        window.dispatchEvent(new Event("toggle-theme"));
      }

      if (event.key.toLowerCase() === "b") {
        window.dispatchEvent(new Event("toggle-chart"));
      }

      if (event.key.toLowerCase() === "r") {
        window.location.reload();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors">
      <DashboardHeader />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ContributionGraph />
        </div>

        <div className="flex flex-col gap-6">
          <StreakTracker />
        </div>
      </div>

      <div className="mt-6">
        <PRMetrics />
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopRepos />
        <GoalTracker />
      </div>
    </div>
  );
}