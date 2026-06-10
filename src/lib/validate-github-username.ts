const GITHUB_USERNAME_RE = /^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i;

/**
 * Validates whether a given string is a valid GitHub username format.
 * GitHub usernames can only contain alphanumeric characters or hyphens,
 * cannot start or end with a hyphen, and have a maximum length of 39 characters.
 * @param username - The username string to validate.
 * @returns True if the username has a valid format, false otherwise.
 */
export function isValidGitHubUsername(username: string): boolean {
  return GITHUB_USERNAME_RE.test(username);
}

/**
 * Trims and validates a potential GitHub username.
 * @param value - The raw string value, or null/undefined.
 * @returns The normalized username string if valid, or null if invalid or empty.
 */
export function normalizeGitHubUsername(
  value: string | null | undefined
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return isValidGitHubUsername(trimmed) ? trimmed : null;
}
