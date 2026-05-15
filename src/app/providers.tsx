"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import ThemeSync from "@/components/ThemeSync";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeSync />
      {children}
    </SessionProvider>
  );
}
