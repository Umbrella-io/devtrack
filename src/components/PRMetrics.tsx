"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Percent } from "lucide-react";

interface PRMetricsProps {
  metrics?: {
    reviewsGiven: number;
    reviewRatio: number;
  };
  isLoading: boolean;
}

export function PRMetrics({ metrics, isLoading }: PRMetricsProps) {
  if (isLoading) {
    return (
      <div 
        className="grid gap-4 md:grid-cols-2" 
        role="status" 
        aria-live="polite" 
        aria-busy="true"
      >
        <span className="sr-only">Loading review metrics...</span>
        <Card className="animate-pulse bg-[#1E293B] border-none">
          <CardHeader className="h-12" />
          <CardContent className="h-16" />
        </Card>
        <Card className="animate-pulse bg-[#1E293B] border-none">
          <CardHeader className="h-12" />
          <CardContent className="h-16" />
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="bg-[#1E293B] border-none text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-[#FFFFFF]">Reviews Given (Last 30 Days)</CardTitle>
          <Eye className="h-4 w-4 text-[#94A3B8]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.reviewsGiven ?? 0}</div>
          <p className="text-xs text-[#94A3B8]">Total pull request reviews submitted</p>
        </CardContent>
      </Card>

      <Card className="bg-[#1E293B] border-none text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-[#FFFFFF]">Review Participation Ratio</CardTitle>
          <Percent className="h-4 w-4 text-[#94A3B8]" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics?.reviewRatio ?? 0}x</div>
          <p className="text-xs text-[#94A3B8]">Reviews submitted per authored PR</p>
        </CardContent>
      </Card>
    </div>
  );
}