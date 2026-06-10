export function isValidSupabaseUrl(value: string | undefined): value is string {
  const url = value?.trim();

  if (!url || url.includes("placeholder")) {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function isConfiguredSupabaseKey(value: string | undefined): value is string {
  return !!value?.trim() && !value.includes("placeholder");
}
