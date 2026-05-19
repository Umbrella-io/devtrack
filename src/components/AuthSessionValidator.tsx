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
        if (!res.ok && active) {
          await signOut({ callbackUrl: "/" });
        }
      } catch {
        if (active) {
          await signOut({ callbackUrl: "/" });
        }
      }
    };

    validateUser();

    return () => {
      active = false;
    };
  }, [status]);

  return null;
}
