"use client";

import Image from "next/image";
import { ContributorMetric } from "@/lib/repoAnalytics";

export default function ContributorStats({ contributors }: { contributors: ContributorMetric[] }) {
  return (
    <div className="space-y-3">
      {contributors.map((contributor) => (
        <div key={contributor.login} className="flex items-center gap-3">
          <Image src={contributor.avatarUrl} alt={contributor.login} width={28} height={28} className="h-7 w-7 rounded-full" />
          <div className="min-w-0 flex-1">
            <div className="flex justify-between text-xs text-slate-300">
              <span className="truncate">{contributor.login}</span>
              <span>{contributor.commits} commits</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-700">
              <div className="h-full rounded-full bg-indigo-400" style={{ width: `${contributor.percentage}%` }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
