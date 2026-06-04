"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ProfileThemeWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("profile-theme");

    if (savedTheme) {
      setTheme(savedTheme);
    }

    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";

    setTheme(newTheme);
    localStorage.setItem("profile-theme", newTheme);
  };

  if (!mounted) return null;

  return (
    <div
      className={
        theme === "dark"
          ? "bg-[#020817] text-white min-h-screen"
          : "bg-white text-black min-h-screen"
      }
    >
      {children}
    </div>
  );
}