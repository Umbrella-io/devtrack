"use client";

import { useEffect } from "react";
import { useSession, signOut } from "next-auth/react";

/**
 * Detects a revoked GitHub token (session.error === "TokenRevoked") and
 * immediately signs the user out, then redirects to /auth/signin with a
 * clear error message.
 *
 * This must be a client component because signOut() is a client-only API.
 * Mount it once inside any authenticated layout or page.
 */
export default function TokenRevokedGuard() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.error === "TokenRevoked") {
      signOut({
        callbackUrl: "/auth/signin?error=TokenRevoked",
      });
    }
  }, [session?.error]);

  // Renders nothing — purely a side-effect component
  return null;
}