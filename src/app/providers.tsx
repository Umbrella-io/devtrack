"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { AccountProvider } from "@/components/AccountContext";
import { ThemeProvider } from "@/components/ThemeContext";
import AuthSessionValidator from "@/components/AuthSessionValidator";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthSessionValidator />
      <AccountProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </AccountProvider>
    </SessionProvider>
  );
}
