/**
 * Normalizes a username by trimming whitespace and converting it to lowercase.
 * @param username - The raw username string.
 * @returns The normalized username.
 */
export function cleanUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Normalizes a repository name by trimming whitespace, replacing spaces with hyphens, and converting to lowercase.
 * @param name - The raw repository name.
 * @returns The normalized repository name.
 */
export function formatRepositoryName(name: string): string {
  return name.trim().replace(/\s+/g, "-").toLowerCase();
}
