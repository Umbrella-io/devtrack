"use client";
type Props = {
  streak: number;
  onDismiss?: () => void;
};

export default function StreakMilestoneBanner({
  streak,
  onDismiss,
}: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-xl p-4 mb-4 flex items-center justify-between"
      style={{
        background: "var(--accent)",
        color: "var(--accent-foreground)",
      }}
    >
      <div>
        🎉 You reached a {streak}-day streak! Keep it up!
      </div>

      <button
        type="button"
        onClick={() => onDismiss?.()}
        aria-label="Dismiss milestone banner"
        className="ml-4 rounded-md p-1 opacity-70 hover:opacity-100 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
}

