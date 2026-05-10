"use client";

import { useEffect } from "react";

export default function AuthTokenHandler() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const token = params.get("token");

    if (!token) {
      return;
    }

    window.localStorage.setItem("devtrack_token", token);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  return null;
}
