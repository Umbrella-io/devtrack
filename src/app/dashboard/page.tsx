import DashboardWidgets from "@/components/DashboardWidgets";

import { authOptions } from "@/lib/auth";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const allowPlaywrightBypass =
    process.env.PLAYWRIGHT_AUTH_BYPASS === "1" &&
    cookies().get("playwright-dashboard-auth")?.value === "1";
  const session = allowPlaywrightBypass
    ? null
    : await getServerSession(authOptions);

  if (!session && !allowPlaywrightBypass) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-4 md:p-8 text-[var(--foreground)] transition-colors">      <DashboardWidgets />
    </div>
  );
}
