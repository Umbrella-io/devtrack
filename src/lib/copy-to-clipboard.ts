export class CopyToClipboardError extends Error {
  constructor(message = "Failed to copy to clipboard.") {
    super(message);
    this.name = "CopyToClipboardError";
  }
}

export async function copyTextToClipboard(text: string): Promise<void> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall through to legacy copy when clipboard API is blocked.
    }
  }

  if (typeof document === "undefined") {
    throw new CopyToClipboardError();
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  textArea.style.pointerEvents = "none";
  document.body.appendChild(textArea);
  textArea.select();

  try {
    const copied = document.execCommand("copy");
    if (!copied) {
      throw new CopyToClipboardError();
    }
  } finally {
    document.body.removeChild(textArea);
  }
}
