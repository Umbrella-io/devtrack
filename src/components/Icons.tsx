"use client";

import {
  Trophy,
  Zap,
  Flame,
  Calendar,
  Star,
  Sun,
  Cloud,
  Sunset,
  Moon,
  Download,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Code,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  Heart,
  Share2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Loader,
} from "lucide-react";

/**
 * Centralized icon component for consistent icon usage across the app.
 * Maps string-based icon names to Lucide icons.
 * 
 * Usage:
 * <Icon name="trophy" size={24} className="text-accent" />
 */

interface IconProps {
  name: string;
  size?: number | string;
  className?: string;
  "aria-hidden"?: boolean;
}

const iconMap: Record<string, React.ComponentType<any>> = {
  trophy: Trophy,
  zap: Zap,
  flame: Flame,
  calendar: Calendar,
  star: Star,
  sun: Sun,
  cloud: Cloud,
  sunset: Sunset,
  moon: Moon,
  download: Download,
  arrowUp: ArrowUp,
  arrowDown: ArrowDown,
  trendingUp: TrendingUp,
  code: Code,
  gitBranch: GitBranch,
  gitCommit: GitCommit,
  gitPullRequest: GitPullRequest,
  clock: Clock,
  alertTriangle: AlertTriangle,
  checkCircle: CheckCircle,
  settings: Settings,
  logOut: LogOut,
  menu: Menu,
  close: X,
  search: Search,
  bell: Bell,
  heart: Heart,
  share: Share2,
  chevronRight: ChevronRight,
  chevronLeft: ChevronLeft,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  moreHorizontal: MoreHorizontal,
  loader: Loader,
};

export function Icon({ name, size = 24, className = "", ...props }: IconProps) {
  const IconComponent = iconMap[name];

  if (!IconComponent) {
    console.warn(`Icon "${name}" not found in icon map`);
    return null;
  }

  return <IconComponent size={size} className={className} {...props} />;
}

/**
 * Export individual icons for direct usage
 */
export {
  Trophy,
  Zap,
  Flame,
  Calendar,
  Star,
  Sun,
  Cloud,
  Sunset,
  Moon,
  Download,
  ArrowUp,
  ArrowDown,
  TrendingUp,
  Code,
  GitBranch,
  GitCommit,
  GitPullRequest,
  Clock,
  AlertTriangle,
  CheckCircle,
  Settings,
  LogOut,
  Menu,
  X,
  Search,
  Bell,
  Heart,
  Share2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Loader,
};
