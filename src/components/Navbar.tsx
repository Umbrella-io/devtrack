"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-800 bg-black text-white shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        
        {/* Logo */}
        <Link
          href="/"
          className="text-2xl font-bold tracking-wide"
        >
          DevTrack
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-6 md:flex">
          <Link href="/" className="hover:text-blue-400">
            Dashboard
          </Link>

          <Link href="/" className="hover:text-blue-400">
            Streaks
          </Link>

          <Link href="/" className="hover:text-blue-400">
            Pull Requests
          </Link>

          <Link href="/" className="hover:text-blue-400">
            Goals
          </Link>

          <Link href="/" className="hover:text-blue-400">
            Leaderboard
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4">
          
          {/* Desktop Sign In */}
          <button className="hidden rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-200 md:block">
            Sign In
          </button>

          {/* Mobile Menu Button */}
          <button
            className="text-3xl md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="flex flex-col gap-4 border-t border-gray-800 bg-black px-6 py-4 md:hidden">
          <Link href="/" className="hover:text-blue-400">
            Dashboard
          </Link>

          <Link href="/" className="hover:text-blue-400">
            Streaks
          </Link>

          <Link href="/" className="hover:text-blue-400">
            Pull Requests
          </Link>

          <Link href="/" className="hover:text-blue-400">
            Goals
          </Link>

          <Link href="/" className="hover:text-blue-400">
            Leaderboard
          </Link>

          <button className="rounded-lg bg-white px-4 py-2 text-black hover:bg-gray-200">
            Sign In
          </button>
        </div>
      )}
    </nav>
  );
}