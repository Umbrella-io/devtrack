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
        { href: "/dashboard", label: "Overview" },
        { href: "/dashboard#streaks", label: "Activity" },
        { href: "/dashboard#pull-requests", label: "Analytics" },
        { href: "/dashboard#goals", label: "Goals" },
        { href: "/leaderboard", label: "Leaderboard" },
      ];
    }
    return [
      { href: "/", label: "Home" },
      { href: "/#features", label: "Features" },
      { href: "/leaderboard", label: "Leaderboard" },
    ];
  }, [isAuthenticated]);

  // Hide the global navbar on pages that have their own navigation structure
  if (pathname === "/" || pathname === "/wrapped") return null;

  const headerStyle: React.CSSProperties = {
    position: "sticky",
    top: 0,
    zIndex: 50,
    background: scrolled ? "rgba(10, 15, 30, 0.75)" : "transparent",
    backdropFilter: scrolled ? "blur(24px) saturate(150%)" : "none",
    WebkitBackdropFilter: scrolled ? "blur(24px) saturate(150%)" : "none",
    borderBottom: scrolled ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid transparent",
    transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
  };

  return (
    <header style={headerStyle}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">

        {/* Logo */}
        <Link
          href={isAuthenticated ? "/dashboard" : "/"}
          className="group inline-flex items-center gap-2.5 select-none transition-transform duration-300 hover:scale-[1.02]"
          style={{ fontFamily: MONO }}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent)]/10 text-base font-bold text-[var(--accent)] transition-colors group-hover:bg-[var(--accent)]/20">
            ▲
          </span>
          <span className="text-sm font-bold tracking-[0.2em] text-[var(--foreground)]">
            DEVTRACK
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex rounded-full border border-white/5 bg-white/[0.02] px-2 py-1.5 shadow-sm" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-300 ${
                  active 
                    ? "bg-[var(--accent)]/10 text-[var(--accent)] shadow-sm" 
                    : "text-[var(--muted-foreground)] hover:bg-white/5 hover:text-[var(--foreground)]"
                }`}
                style={{ fontFamily: MONO }}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Desktop right */}
        <div className="hidden items-center gap-4 md:flex">
          {isAuthenticated ? (
            <div className="flex items-center gap-4 border-l border-white/10 pl-4">
              <Link 
                href="/dashboard/settings"
                className="text-[12px] font-medium text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
                style={{ fontFamily: MONO }}
              >
                ⚙️ Settings
              </Link>
              <div className="flex items-center gap-3">
                <span
                  className="hidden max-w-[140px] truncate text-[12px] font-medium text-[var(--foreground)] lg:block"
                  style={{ fontFamily: MONO }}
                >
                  @{identityLabel}
                </span>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[12px] font-medium text-red-400 transition-all hover:bg-red-500/20 hover:text-red-300"
                  style={{ fontFamily: MONO }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          ) : (
            !isPublicProfileRoute && (
              <Link
                href="/api/auth/signin/github?callbackUrl=/dashboard"
                className="rounded-full px-5 py-2 text-[13px] font-semibold text-[var(--accent-foreground)] shadow-[0_0_20px_rgba(129,140,248,0.3)] transition-all hover:scale-105 hover:shadow-[0_0_25px_rgba(129,140,248,0.5)]"
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
          className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2.5 text-[var(--foreground)] transition-colors hover:bg-white/10 md:hidden"
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
          className="border-t border-white/10 md:hidden"
          style={{ background: "rgba(10,15,30,0.98)", backdropFilter: "blur(24px)" }}
        >
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-5 sm:px-6">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-4 py-3.5 text-sm font-medium transition-colors ${
                    active ? "bg-[var(--accent)]/15 text-[var(--accent)]" : "text-[var(--muted-foreground)] hover:bg-white/5"
                  }`}
                  style={{ fontFamily: MONO }}
                >
                  {item.label}
                </Link>
              );
            })}
            
            {isAuthenticated && (
              <Link
                href="/dashboard/settings"
                className="rounded-xl px-4 py-3.5 text-sm font-medium text-[var(--muted-foreground)] hover:bg-white/5 transition-colors"
                style={{ fontFamily: MONO }}
              >
                Settings
              </Link>
            )}

            <div className="mt-4 border-t border-white/10 pt-4">
              {isAuthenticated ? (
                <div className="flex flex-col gap-3">
                  <p className="px-4 py-2 text-[12px] text-[var(--muted-foreground)]" style={{ fontFamily: MONO }}>
                    Logged in as <span className="font-semibold text-[var(--foreground)]">@{identityLabel}</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full rounded-xl bg-red-500/10 px-4 py-3.5 text-left text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
                    style={{ fontFamily: MONO }}
                  >
                    Sign out →
                  </button>
                </div>
              ) : (
                !isPublicProfileRoute && (
                  <Link
                    href="/api/auth/signin/github?callbackUrl=/dashboard"
                    className="block w-full rounded-xl px-4 py-3.5 text-center text-sm font-semibold text-[var(--accent-foreground)] shadow-lg"
                    style={{ background: "var(--accent)", fontFamily: MONO }}
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
