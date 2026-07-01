"use client";

import CopyToClipboardButton from "@/components/CopyToClipboardButton";

interface ShareProfileButtonProps {
  githubLogin: string;
}

export default function ShareProfileButton({
  githubLogin,
}: ShareProfileButtonProps) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://devtrack-delta.vercel.app";
  const profileUrl = `${baseUrl}/u/${githubLogin}`;

  return (
    <CopyToClipboardButton
      value={profileUrl}
      label="Share Profile"
      copiedLabel="Copied"
      showToast
      successMessage="Link copied!"
      errorMessage="Failed to copy link"
      ariaLabel="Share profile link"
    />
  );
}
