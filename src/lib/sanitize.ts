/**
 * Strips HTML tags and decodes common HTML entities from a string, normalizing the unicode representation.
 * @param value - The raw string input that might contain HTML tags or entities.
 * @returns The normalized, plain-text string.
 */
export function stripHtml(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/<[^>]*>/g, "")
    .replace(/&(?:lt|gt|amp|quot|#x27|#39);/gi, (m) => {
      const map: Record<string, string> = {
        "&lt;": "<",
        "&gt;": ">",
        "&amp;": "&",
        "&quot;": '"',
        "&#x27;": "'",
        "&#39;": "'",
      };
      return map[m] ?? m;
    })
    .trim();
}

export interface ValidationResult {
  ok: boolean;
  value: string;
  error?: string;
}

/**
 * Validates and sanitizes a text input, checking for correct type, content, and maximum length.
 * @param raw - The raw input value of unknown type.
 * @param field - The name of the field being validated (used in error messages).
 * @param maxLen - The maximum allowed length for the sanitized text. Defaults to 200.
 * @returns An object indicating validation success/failure, the sanitized value, and optional error message.
 */
export function validateTextInput(
  raw: unknown,
  field: string,
  maxLen = 200
): ValidationResult {
  if (typeof raw !== "string") {
    return { ok: false, value: "", error: `${field} must be a string` };
  }
  const stripped = stripHtml(raw);
  if (stripped.length === 0) {
    return { ok: false, value: "", error: `${field} must not be empty` };
  }
  if (stripped.length > maxLen) {
    return { ok: false, value: "", error: `${field} must be ${maxLen} characters or fewer` };
  }
  return { ok: true, value: stripped };
}
