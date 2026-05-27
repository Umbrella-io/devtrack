"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavItem = {
  href: string;
  label: string;
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }

  if (href.includes("#")) {
    const [base] = href.split("#");
    return pathname === base;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
export default function AppNavbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const isAuthenticated = status === "authenticated" && Boolean(session);
  const identityLabel =
    session?.user?.name ?? session?.githubLogin ?? session?.user?.email ?? "GitHub user";

  const navItems = useMemo<NavItem[]>(() => {
    if (isAuthenticated) {
      return [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard#streaks", label: "Streaks" },
        { href: "/dashboard#pull-requests", label: "Pull Requests" },
        { href: "/dashboard#goals", label: "Goals" },
        { href: "/leaderboard", label: "Leaderboard" },
        { href: "/dashboard/settings", label: "Settings" },
      ];
    }

    return [
      { href: "/", label: "Home" },
      { href: "/#features", label: "Features" },
      { href: "/#open-source", label: "Open Source" },
      { href: "/leaderboard", label: "Leaderboard" },
    ];
  }, [isAuthenticated]);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_82%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href={isAuthenticated ? "/dashboard" : "/"}
          className="inline-flex items-center gap-2 text-sm font-semibold tracking-[0.16em] text-[var(--foreground)]"
          style={{ fontFamily: "var(--font-jetbrains, ui-monospace, monospace)" }}
        >
          <span className="text-[var(--accent)]">{">"}</span>
          <span>DEVTRACK</span>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--card)] hover:text-[var(--foreground)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <>
              <div className="hidden max-w-48 truncate rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm text-[var(--card-foreground)] xl:block">
                {identityLabel}
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-full bg-[var(--destructive)] px-4 py-2 text-sm font-semibold text-[var(--destructive-foreground)] transition-opacity hover:opacity-90"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              href="/api/auth/signin/github?callbackUrl=/dashboard"
              className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition-opacity hover:opacity-90"
            >
              Sign in with GitHub
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="inline-flex items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] p-2 text-[var(--foreground)] lg:hidden"
          aria-expanded={mobileOpen}
          aria-controls="app-mobile-nav"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div
          id="app-mobile-nav"
          className="border-t border-[var(--border)] bg-[var(--background)] lg:hidden"
        >
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6 lg:px-8">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${
                    active
                      ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                      : "bg-[var(--card)] text-[var(--card-foreground)] hover:bg-[var(--control)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}

            {isAuthenticated ? (
              <>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--card-foreground)]">
                  {identityLabel}
                </div>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-2xl bg-[var(--destructive)] px-4 py-3 text-left text-sm font-semibold text-[var(--destructive-foreground)]"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/api/auth/signin/github?callbackUrl=/dashboard"
                className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-[var(--accent-foreground)]"
              >
                Sign in with GitHub
              </Link>
            )}
          </div>
        </div>
      ) : null}
    </header>
  );
}
