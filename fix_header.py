import re

with open("src/components/DashboardHeader.tsx", "r") as f:
    content = f.read()

replacement = """        <div>
          <div className="flex flex-col gap-1">
            {/* Dynamic Personalized Friendly Greeting Badge Element Overlay */}
            <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-[var(--accent)]/10 border border-[var(--accent)]/20 px-2.5 py-0.5 text-xs font-semibold text-[var(--accent)] transition-all duration-300">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--accent)]"></span>
              </span>
              <span>
                {greeting}, {displayName}!
              </span>
            </div>

            <h1 className="bg-gradient-to-r from-[var(--foreground)] via-[var(--foreground)] to-[var(--accent)] bg-clip-text text-3xl font-extrabold text-transparent md:text-4xl mt-1">
              Dashboard
            </h1>
          </div>

          <p className="mt-2 text-sm md:text-base text-[var(--muted-foreground)]">
            Your coding activity at a glance 🚀
          </p>
          {minutesAgo !== null && (
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {minutesAgo <= 0 ? "Synced just now" : `Synced ${minutesAgo} min ago`}
            </p>
          )}
        </div>"""

# Find the block starting with `        <div>\n          <div className="flex flex-col gap-1">` and ending at `          )}\n        </div>`
content = re.sub(r'        <div>\n          <div className="flex flex-col gap-1">.*?\n        </div>', replacement, content, flags=re.DOTALL)

with open("src/components/DashboardHeader.tsx", "w") as f:
    f.write(content)
