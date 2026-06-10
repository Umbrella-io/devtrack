import { normalizeGitHubUsername } from "./validate-github-username";

/**
 * Normalizes a GitHub username for a room by validating and formatting it.
 * @param value - The raw username input, or null/undefined.
 * @returns The normalized username, or null if invalid or empty.
 */
export function normalizeRoomGithubUsername(
  value: string | null | undefined
): string | null {
  return normalizeGitHubUsername(value);
}

/**
 * Compares two GitHub usernames for equality in a case-insensitive manner.
 * @param a - The first username.
 * @param b - The second username.
 * @returns True if they are equal (ignoring case), false otherwise.
 */
export function githubUsernamesEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
