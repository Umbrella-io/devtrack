"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { AccountProvider } from "@/components/AccountContext";
import { ThemeProvider } from "@/components/ThemeContext";
import GlobalKeyboardShortcuts from "@/components/GlobalKeyboardShortcuts";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AccountProvider>
        <ThemeProvider>
          {children}
          <GlobalKeyboardShortcuts />
        </ThemeProvider>
      </AccountProvider>
    </SessionProvider>
  );
}
