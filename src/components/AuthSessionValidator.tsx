"use client";

import { useEffect } from "react";
import { signOut, useSession } from "next-auth/react";

export default function AuthSessionValidator() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    let active = true;

    const validateUser = async () => {
      try {
        const res = await fetch("/api/auth/me", { cache: "no-store" });
        // Only sign out on authentication errors (401) or missing resource (404)
        if ((res.status === 401 || res.status === 404) && active) {
          await signOut({ callbackUrl: "/" });
        }
      } catch {
        // Transient network errors should not trigger sign out
      }
    };

    validateUser();

    return () => {
      active = false;
    };
  }, [status]);

  return null;
}
