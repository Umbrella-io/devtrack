import WeeklyReport from "@/components/WeeklyReport";

export default function WeeklyReportPage() {

  const weeklyData = {
    codingHours: 24,
    skills: ["React", "Node.js", "TypeScript"],
    projects: ["DevTrack", "Portfolio Website"],
    githubCommits: 38,
    streak: 7,
  };

  return (
    <div className="min-h-screen p-6 bg-zinc-100 dark:bg-black">
      <WeeklyReport {...weeklyData} />
    </div>
  );
}