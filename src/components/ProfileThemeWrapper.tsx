"use client";

import { useEffect, useState } from "react";
import { useTheme } from "./ThemeContext";

export default function ProfileThemeWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { themeMode } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="bg-[var(--background)] text-[var(--foreground)] min-h-screen transition-colors duration-200">
      {children}
    </div>
  );
}