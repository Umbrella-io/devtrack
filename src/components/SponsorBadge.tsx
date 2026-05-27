interface SponsorBadgeProps {
  className?: string;
}

export default function SponsorBadge({
  className = "",
}: SponsorBadgeProps) {
  return (
    <span
      title="GitHub Sponsor — thank you for supporting DevTrack!"
      aria-label="GitHub Sponsor"
      className={`ml-2 inline-flex items-center rounded-full border border-pink-500/40 bg-pink-500/10 px-2 py-0.5 text-xs font-medium text-pink-400 ${className}`}
    >
      💎 Sponsor
    </span>
  );
}
