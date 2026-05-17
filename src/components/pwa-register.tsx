"use client";

import { useEffect } from "react";

export default function PWARegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then(() => {
            console.log("Service worker registered");
          })
          .catch((error) => {
            console.error("Service worker registration failed:", error);
          });
      });
    }
  }, []);

  return null;
}
