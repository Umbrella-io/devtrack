"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { AccountProvider } from "@/components/AccountContext";
import { ThemeProvider } from "@/components/ThemeContext";
import BackToTopButton from "@/components/BackToTopButton";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AccountProvider>
        <ThemeProvider>
          {children}
          <BackToTopButton />
        </ThemeProvider>
      </AccountProvider>
    </SessionProvider>
  );
}
