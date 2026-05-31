import re
import os

# Fix req.ip
for filename in ["src/lib/badge-rate-limit.ts", "src/lib/contact-rate-limit.ts", "src/middleware.ts"]:
    if os.path.exists(filename):
        with open(filename, "r") as f:
            content = f.read()
        content = content.replace("req.ip", '(req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1")')
        with open(filename, "w") as f:
            f.write(content)

# Fix Recharts Formatter type (usually `(value: number)` -> `(value: any)`)
for filename in ["src/components/CommitTimeChart.tsx", "src/components/CodingTimeWidget.tsx", "src/components/repo-analytics/RepoLanguagePie.tsx"]:
    if os.path.exists(filename):
        with open(filename, "r") as f:
            content = f.read()
        content = content.replace("formatter={(value: number)", "formatter={(value: any)")
        content = content.replace("formatter={(value: number,", "formatter={(value: any,")
        with open(filename, "w") as f:
            f.write(content)

# Fix GoalTracker.tsx
if os.path.exists("src/components/GoalTracker.tsx"):
    with open("src/components/GoalTracker.tsx", "r") as f:
        content = f.read()
    content = content.replace("setParticles((prev) => [...prev, ", "setParticles((prev: any) => [...prev, ")
    with open("src/components/GoalTracker.tsx", "w") as f:
        f.write(content)

