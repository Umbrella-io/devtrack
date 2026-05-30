"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { status } = useSession({ required: true });
  const router = useRouter();

  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (response.status === 401) {
        const cloned = response.clone();
        toast.error("Session expired. Please sign in again.");
        await signOut({ redirect: false });
        router.push("/auth/signin");
        return cloned;
      }
      return response;
    };
    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

  if (status === "loading") return null;

  return <>{children}</>;
}