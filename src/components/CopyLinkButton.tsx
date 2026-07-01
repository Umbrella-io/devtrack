"use client";

import CopyToClipboardButton from "@/components/CopyToClipboardButton";

interface CopyLinkButtonProps {
  url: string;
}

export default function CopyLinkButton({ url }: CopyLinkButtonProps) {
  return (
    <CopyToClipboardButton
      value={url}
      label="Copy link"
      copiedLabel="Copied!"
      variant="outline"
      size="sm"
      showToast
      successMessage="Link copied!"
      errorMessage="Failed to copy link."
      ariaLabel="Copy profile link"
      className="text-xs font-medium"
    />
  );
}
