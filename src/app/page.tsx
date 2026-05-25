import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LandingPage, { type RepoStats } from "@/components/landing/LandingPage";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["700", "800"],
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

async function fetchRepoStats(): Promise<RepoStats> {
  return {
    stars: 40,
    forks: 160,
    openIssues: 307,
    contributorCount: 30,
    goodFirstIssues: 36,
    contributors: [],
  };
}

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  const repoStats = await fetchRepoStats();

  return (
    <div className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <LandingPage repoStats={repoStats} />
    </div>
  );
}