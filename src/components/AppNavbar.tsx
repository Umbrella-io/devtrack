"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavItem = { href: string; label: string };

function isActivePath(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  if (href.includes("#")) {
    const [base] = href.split("#");
    return pathname === base;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

const MONO = "var(--font-jetbrains, ui-monospace, monospace)";

export default function AppNavbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const isAuthenticated = status === "authenticated" && Boolean(session);
  const isPublicProfileRoute = pathname.startsWith("/u/");
  const identityLabel =
    session?.githubLogin ?? session?.user?.name ?? session?.user?.email ?? "user";

  const navItems = useMemo<NavItem[]>(() => {
    if (isAuthenticated) {
      return [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/dashboard#streaks", label: "Streaks" },
        { href: "/dashboard#pull-requests", label: "PRs" },
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

  const headerStyle: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: scrolled ? "rgba(6,11,24,0.92)" : "var(--background)",
    backdropFilter: scrolled ? "blur(16px)" : "none",
    WebkitBackdropFilter: scrolled ? "blur(16px)" : "none",
    borderBottom: "1px solid var(--border)",
    transition: "background 0.3s ease",
  };

  return (
    <header style={headerStyle}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link
          href={isAuthenticated ? "/dashboard" : "/"}
          className="inline-flex items-center gap-2 select-none"
          style={{ fontFamily: MONO }}
        >
          <span className="text-base font-bold" style={{ color: "var(--accent)" }}>▲</span>
          <span className="text-sm font-bold tracking-[0.18em] text-[var(--foreground)]">DEVTRACK</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center lg:flex" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative px-3 py-2 text-[12px] font-medium transition-colors duration-150"
                style={{
                  fontFamily: MONO,
                  color: active ? "var(--accent)" : "var(--muted-foreground)",
                }}
                onMouseEnter={(e) => {
                  if (!active) (e.currentTarget as HTMLAnchorElement).style.color = "var(--foreground)";
                }}
                onMouseLeave={(e) => {
                  if (!active) (e.currentTarget as HTMLAnchorElement).style.color = "var(--muted-foreground)";
                }}
              >
                {item.label}
                {active && (
                  <span
                    className="absolute inset-x-2 bottom-0 h-px"
                    style={{ background: "var(--accent)" }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop right */}
        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <>
              <span
                className="hidden max-w-44 truncate text-[11px] text-[var(--muted-foreground)] xl:block"
                style={{ fontFamily: MONO }}
              >
                @{identityLabel}
              </span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[11px] font-medium text-[var(--muted-foreground)] transition-colors hover:border-red-500/60 hover:text-red-400"
                style={{ fontFamily: MONO }}
              >
                sign out →
              </button>
            </>
          ) : (
            !isPublicProfileRoute && (
              <Link
                href="/api/auth/signin/github?callbackUrl=/dashboard"
                className="rounded-md px-4 py-2 text-[12px] font-semibold text-[var(--accent-foreground)] transition-opacity hover:opacity-90"
                style={{ fontFamily: MONO, background: "var(--accent)" }}
              >
                SIGN IN →
              </Link>
            )
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          onClick={() => setMobileOpen((o) => !o)}
          className="inline-flex items-center justify-center rounded-md border border-[var(--border)] p-2 text-[var(--foreground)] lg:hidden"
          aria-expanded={mobileOpen}
          aria-controls="app-mobile-nav"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          id="app-mobile-nav"
          className="border-t border-[var(--border)] lg:hidden"
          style={{ background: "rgba(6,11,24,0.97)", backdropFilter: "blur(16px)" }}
        >
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-4 py-3 text-sm font-medium transition-colors"
                  style={{
                    fontFamily: MONO,
                    color: active ? "var(--accent)" : "var(--muted-foreground)",
                    background: active ? "var(--accent-soft)" : "transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="mt-3 border-t border-[var(--border)] pt-3">
              {isAuthenticated ? (
                <>
                  <p className="px-4 py-1.5 text-[11px] text-[var(--muted-foreground)]" style={{ fontFamily: MONO }}>
                    @{identityLabel}
                  </p>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
                    style={{ fontFamily: MONO }}
                  >
                    sign out →
                  </button>
                </>
              ) : (
                !isPublicProfileRoute && (
                  <Link
                    href="/api/auth/signin/github?callbackUrl=/dashboard"
                    className="block rounded-lg px-4 py-3 text-center text-sm font-semibold text-[var(--accent-foreground)]"
                    style={{ background: "var(--accent)" }}
                  >
                    SIGN IN →
                  </Link>
                )
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
