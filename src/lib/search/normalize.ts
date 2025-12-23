/**
 * Normalize search query for matching:
 * - trim whitespace
 * - collapse multiple spaces
 * - remove diacritics (accents)
 * - lowercase
 */
export function normalizeQuery(q: string): string {
  return q
    .trim()
    .replace(/\s+/g, " ") // Collapse spaces
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .toLowerCase();
}

/**
 * Extract tokens from query (split by spaces, filter empty)
 */
export function tokenizeQuery(q: string): string[] {
  return normalizeQuery(q)
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

