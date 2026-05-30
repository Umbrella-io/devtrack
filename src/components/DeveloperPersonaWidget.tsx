"use client";

export default function DeveloperPersonaWidget() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="text-3xl">🔥</span>

        <div>
          <h2 className="text-lg font-semibold">
            Developer Persona
          </h2>

          <p className="text-sm text-[var(--muted-foreground)]">
            Personalized activity profile
          </p>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-xl font-bold">
          Consistent Contributor
        </h3>

        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Your activity pattern suggests regular contributions,
          steady coding habits, and active participation in projects.
        </p>
      </div>

      <div className="mt-4 rounded-lg border p-3">
        <p className="text-sm font-medium">
          Activity Score
        </p>

        <p className="text-2xl font-bold">
          82 / 100
        </p>
      </div>

      <div className="mt-4">
        <p className="text-sm font-medium">
          Recommendation
        </p>

        <p className="text-sm text-[var(--muted-foreground)]">
          Increase collaboration and review activity to progress toward
          Open Source Champion status.
        </p>
      </div>
    </div>
  );
}