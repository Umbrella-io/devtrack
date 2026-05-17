"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import ThemeSync from "@/components/ThemeSync";
import PwaRegistration from "@/components/PwaRegistration";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeSync />
      <PwaRegistration />
      {children}
    </SessionProvider>
  );
}
