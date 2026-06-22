export function stripHtml(value: string): string {
  // Decode entities FIRST, then strip tags — not the other way around.
  // The original order (strip tags → decode entities) allowed entity-encoded
  // payloads like &lt;script&gt; to survive tag-stripping and then get
  // reconstructed into live <script> tags by the decode step, bypassing
  // the sanitizer entirely (XSS via entity encoding).
  return value
    .normalize("NFKC")
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
    .replace(/<[^>]*>/g, "")   // strip tags AFTER decoding — catches entity-smuggled tags
    .trim();
}

export interface ValidationResult {
  ok: boolean;
  value: string;
  error?: string;
}

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