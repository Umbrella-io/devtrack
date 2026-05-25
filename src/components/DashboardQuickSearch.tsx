"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

const SEARCH_SELECTOR = "[data-dashboard-search-item]";
const GROUP_SELECTOR = "[data-dashboard-search-group]";

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export default function DashboardQuickSearch({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(0);
  const [hasSearchableItems, setHasSearchableItems] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(normalizeText(query));
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    const applyFilter = () => {
      const items = Array.from(root.querySelectorAll<HTMLElement>(SEARCH_SELECTOR));
      const groups = Array.from(root.querySelectorAll<HTMLElement>(GROUP_SELECTOR));
      let visibleItems = 0;
      let searchableItems = 0;

      for (const item of items) {
        const searchableText = normalizeText(
          item.dataset.dashboardSearchText ?? item.textContent ?? ""
        );
        const canSearch = searchableText.length > 0;
        if (canSearch) searchableItems += 1;

        const isVisible =
          debouncedQuery.length === 0 ||
          (canSearch && searchableText.includes(debouncedQuery));

        item.toggleAttribute("hidden", !isVisible);
        item.setAttribute("aria-hidden", isVisible ? "false" : "true");

        if (isVisible) {
          visibleItems += 1;
        }
      }

      for (const group of groups) {
        const groupItems = Array.from(group.querySelectorAll<HTMLElement>(SEARCH_SELECTOR));
        const groupIsVisible =
          debouncedQuery.length === 0 ||
          groupItems.some((item) => !item.hasAttribute("hidden"));

        group.toggleAttribute("hidden", !groupIsVisible);
        group.setAttribute("aria-hidden", groupIsVisible ? "false" : "true");
      }

      setVisibleCount(visibleItems);
      setHasSearchableItems(searchableItems > 0);
    };

    applyFilter();

    const observer = new MutationObserver(() => {
      applyFilter();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => observer.disconnect();
  }, [debouncedQuery]);

  useEffect(() => {
    if (debouncedQuery.length === 0) return;

    const root = contentRef.current;
    const target = root?.querySelector<HTMLElement>(`${SEARCH_SELECTOR}:not([hidden])`);

    if (!target) return;

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [debouncedQuery, visibleCount]);

  const showNoResults = debouncedQuery.length > 0 && hasSearchableItems && visibleCount === 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/95 p-4 shadow-sm backdrop-blur-sm md:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
              Dashboard Quick Search
            </p>
            <h2 className="mt-1 text-base font-semibold text-[var(--card-foreground)] md:text-lg">
              Search commits, goals, pull requests, repository names, and languages.
            </h2>
          </div>

          <div className="w-full lg:max-w-md">
            <label htmlFor="dashboard-quick-search" className="sr-only">
              Search dashboard content
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--control)] px-3 py-2 shadow-inner focus-within:border-[var(--accent)]">
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]"
              >
                <path
                  fillRule="evenodd"
                  d="M8.5 3a5.5 5.5 0 104.213 9.05l3.618 3.619a.75.75 0 101.06-1.06l-3.618-3.62A5.5 5.5 0 008.5 3zM4.5 8.5a4 4 0 118 0 4 4 0 01-8 0z"
                  clipRule="evenodd"
                />
              </svg>
              <input
                id="dashboard-quick-search"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search dashboard..."
                className="h-9 w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground)]"
              />
              {query.length > 0 && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-md px-2 py-1 text-xs font-medium text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-3 text-sm text-[var(--muted-foreground)]">
          Use terms like commits, goals, pull requests, repository names, or language names.
        </p>

        {debouncedQuery.length > 0 && (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]" aria-live="polite">
            {showNoResults
              ? "No matching dashboard items found"
              : `${visibleCount} matching dashboard item${visibleCount === 1 ? "" : "s"} visible`}
          </p>
        )}
      </div>

      <div ref={contentRef}>{children}</div>
    </div>
  );
}
