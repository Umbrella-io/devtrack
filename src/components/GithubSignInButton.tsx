"use client";

import { signIn } from "next-auth/react";

export default function GithubSignInButton() {
  return (
    <button
      onClick={() =>
        signIn("github", { callbackUrl: "/dashboard" })
      }
      className="flex items-center justify-center gap-3 bg-black text-white py-4 rounded-xl font-semibold hover:scale-105 hover:opacity-90 transition duration-300 w-full"
    >
      <span className="text-2xl">🐙</span>
      Continue with GitHub
    </button>
  );
}