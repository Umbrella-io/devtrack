"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "devtrack_favorite_repos";
const EVENT_NAME = "devtrack-favorites-changed";

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);

  // Load initial favorites
  const loadFavorites = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        setFavorites(stored ? JSON.parse(stored) : []);
      } catch (err) {
        console.error("Failed to load favorite repos", err);
      }
    }
  }, []);

  useEffect(() => {
    loadFavorites();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        loadFavorites();
      }
    };

    const handleCustomChange = () => {
      loadFavorites();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener(EVENT_NAME, handleCustomChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(EVENT_NAME, handleCustomChange);
    };
  }, [loadFavorites]);

  const toggleFavorite = useCallback((repoFullName: string) => {
    if (typeof window === "undefined") return;

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const current: string[] = stored ? JSON.parse(stored) : [];
      const updated = current.includes(repoFullName)
        ? current.filter((name) => name !== repoFullName)
        : [...current, repoFullName];

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setFavorites(updated);

      // Dispatch custom event to notify other instances/components
      window.dispatchEvent(new Event(EVENT_NAME));
    } catch (err) {
      console.error("Failed to toggle favorite repo", err);
    }
  }, []);

  const isFavorite = useCallback((repoFullName: string) => {
    return favorites.includes(repoFullName);
  }, [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
