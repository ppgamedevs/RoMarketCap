/**
 * Client-side hook for feature flags (if needed in future).
 * For now, flags are server-side only.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useFlag(_flag: string): boolean {
  // Server-side only for now
  // In future, could expose via API endpoint if needed
  return true;
}

