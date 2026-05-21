"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { AccountProvider } from "@/components/AccountContext";
import { ThemeProvider } from "@/components/ThemeContext";
import AuthSessionValidator from "@/components/AuthSessionValidator";
import BackToTopButton from "@/components/BackToTopButton";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthSessionValidator />
      <AccountProvider>
        <ThemeProvider>
          {children}
          <BackToTopButton />
          <style dangerouslySetInnerHTML={{ __html: `
            :root {
              --destructive: #ef4444;
              --destructive-rgb: 239, 68, 68;
            }
            .dark {
              --destructive: #f87171;
              --destructive-rgb: 248, 113, 113;
            }
          `}} />
        </ThemeProvider>
      </AccountProvider>
    </SessionProvider>
  );
}
