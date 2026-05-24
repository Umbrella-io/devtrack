import Link from "next/link";

export default function LoginRequiredPage() {
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-[var(--background)] px-4 overflow-hidden">
      
      {/* Dynamic Background Glow Accents */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full blur-[120px] animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-[120px] animate-pulse [animation-delay:2s] pointer-events-none" />

      {/* Main Interactive Card */}
      <div className="relative max-w-md w-full bg-[var(--card)]/80 backdrop-blur-md border border-[var(--border)] rounded-3xl p-10 shadow-2xl text-center group hover:border-[var(--muted-foreground)]/30 transition-all duration-500">
        
        {/* Floating Rocket Icon Container */}
        <div className="relative inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-[var(--border)] rounded-2xl mb-6 text-4xl shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
          <span className="animate-bounce [animation-duration:3s]">🚀</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--foreground)] mb-3 bg-gradient-to-r from-[var(--foreground)] via-[var(--foreground)] to-[var(--muted-foreground)] bg-clip-text">
          Unlock DevTrack Features
        </h1>

        {/* Description */}
        <p className="text-[var(--muted-foreground)] mb-8 text-sm leading-relaxed max-w-sm mx-auto">
          Sign in with your GitHub account to access premium features like <span className="text-[var(--foreground)] font-medium">streak tracking</span>, <span className="text-[var(--foreground)] font-medium">PR analytics</span>, and custom coding goals.
        </p>

        {/* Primary Action Button (Sign In) */}
        <Link
          href="/api/auth/signin/github?callbackUrl=/dashboard"
          className="relative flex items-center justify-center gap-3 bg-neutral-900 text-white dark:bg-white dark:text-black py-4 rounded-xl font-semibold overflow-hidden shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 group/btn"
        >
          {/* Subtle button glare effect */}
          <div className="absolute inset-0 w-1/2 h-full bg-white/10 dark:bg-black/5 transform -skew-x-12 -translate-x-full group-hover/btn:animate-shine pointer-events-none" />
          
          {/* Modern SVG GitHub Icon */}
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.48.0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.008.069-.008 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
          Continue with GitHub
        </Link>

        {/* Secondary Action (GitHub Link) */}
        <a
          href="https://github.com/Priyanshu-byte-coder/devtrack"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 mt-6 text-xs font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors duration-200 group/link"
        >
          View project on GitHub 
          <span className="inline-block transform group-hover/link:translate-x-1 transition-transform duration-200">→</span>
        </a>
      </div>
    </main>
  );
}