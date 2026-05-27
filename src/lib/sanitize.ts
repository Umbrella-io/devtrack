export function stripHtml(value: string): string {
  return value
    .replace(/<[^>]*>/g, "") // remove all tags
    .replace(/&(?:lt|gt|amp|quot|#x27|#39);/gi, (m) => {
      // decode the five basic HTML entities so we store the real character
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
 * Validate and sanitize a plain-text field coming from a request body.
 *
 * @param raw     The raw value from the request body (may be anything).
 * @param field   The field name shown in error messages.
 * @param maxLen  Maximum allowed length after stripping (default 200).
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
    return {
      ok: false,
      value: "",
      error: `${field} must be ${maxLen} characters or fewer`,
    };
  }

  return { ok: true, value: stripped };
}