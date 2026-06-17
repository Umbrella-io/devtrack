import Link from "next/link";
import type { ReactNode } from "react";

interface EmptyStateProps {
  /** Emoji string or a React node (e.g. a lucide icon). */
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  /** Render the call-to-action as an external link opening in a new tab. */
  external?: boolean;
  /** Use reduced spacing for empty states rendered inside individual widgets. */
  compact?: boolean;
  /** Extra classes for the wrapper element. */
  className?: string;
}

export default function EmptyState({
  icon = "🏆",
  title,
  description,
  actionLabel,
  actionHref,
  external = false,
  compact = false,
  className = "",
}: EmptyStateProps) {
  const isEmoji = typeof icon === "string";

  const ctaClasses =
    "inline-flex items-center gap-2 rounded-lg bg-[var(--foreground)] px-5 py-2.5 text-sm font-medium text-[var(--background)] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--foreground)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]";

  return (
    <div
      className={`flex flex-col items-center justify-center px-4 text-center ${
        compact ? "py-10" : "py-20"
      } ${className}`.trim()}
    >
      <div
        className={`select-none ${compact ? "mb-3 text-4xl" : "mb-6 text-6xl"}`}
        {...(isEmoji
          ? { role: "img", "aria-label": title }
          : { "aria-hidden": true })}
      >
        {icon}
      </div>
      <h2
        className={`font-semibold text-[var(--foreground)] ${
          compact ? "mb-2 text-base" : "mb-3 text-xl"
        }`}
      >
        {title}
      </h2>
      <p
        className={`max-w-sm leading-relaxed text-[var(--muted-foreground)] ${
          compact ? "mb-5 text-sm" : "mb-8"
        }`}
      >
        {description}
      </p>
      {actionLabel &&
        actionHref &&
        (external ? (
          <a
            href={actionHref}
            target="_blank"
            rel="noopener noreferrer"
            className={ctaClasses}
          >
            {actionLabel} →
          </a>
        ) : (
          <Link href={actionHref} className={ctaClasses}>
            {actionLabel} →
          </Link>
        ))}
    </div>
  );
}
