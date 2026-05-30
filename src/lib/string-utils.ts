export function cleanUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function formatRepositoryName(name: string): string {
  return name.trim().replace(/\s+/g, "-").toLowerCase();
}
