import { getCache, setCache, getOrSetCache, type CacheOptions } from "./kv";
import { cookies } from "next/headers";

export type PageCacheKey = {
  page: string;
  params?: Record<string, string | number | null>;
  lang?: string;
  premium?: boolean;
};

/**
 * Generate a cache key from page identifier and params.
 */
export function generateCacheKey(key: PageCacheKey): string {
  const parts = [key.page];
  if (key.lang) parts.push(`lang:${key.lang}`);
  if (key.premium !== undefined) parts.push(`premium:${key.premium}`);
  if (key.params) {
    const sorted = Object.entries(key.params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${v}`)
      .join("|");
    if (sorted) parts.push(sorted);
  }
  return parts.join(":");
}

/**
 * Get cached page data.
 */
export async function getPageCache<T>(key: PageCacheKey, options?: CacheOptions): Promise<T | null> {
  const cacheKey = generateCacheKey(key);
  return getCache<T>(cacheKey, options?.version);
}

/**
 * Set cached page data.
 */
export async function setPageCache<T>(key: PageCacheKey, data: T, options?: CacheOptions): Promise<void> {
  const cacheKey = generateCacheKey(key);
  return setCache(cacheKey, data, options);
}

/**
 * Get cached page data or compute and cache it.
 * Skips caching for edge cases (high page numbers, etc.)
 */
export async function getOrSetPageCache<T>(
  key: PageCacheKey,
  compute: () => Promise<T>,
  options?: CacheOptions,
): Promise<T> {
  // Skip caching for pages beyond reasonable limits (likely bots or edge cases)
  if (key.params?.page && typeof key.params.page === "number" && key.params.page > 100) {
    // Don't cache high page numbers - just compute and return
    return compute();
  }

  const cacheKey = generateCacheKey(key);
  return getOrSetCache(cacheKey, compute, options);
}

/**
 * Get language from cookie (for cache key).
 */
export async function getLangForCache(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get("romc_lang")?.value ?? "ro";
}

/**
 * Standard cache TTLs per page type.
 * Optimized for better performance and reduced database load.
 */
export const PAGE_CACHE_TTLS = {
  company: { ttl: 86400, swr: 172800 }, // 24h fresh, 48h stale - company data changes slowly
  list: { ttl: 900, swr: 3600 }, // 15 min fresh, 1h stale - market/lists update more frequently
  taxonomy: { ttl: 3600, swr: 14400 }, // 1h fresh, 4h stale - taxonomies rarely change
  market: { ttl: 900, swr: 3600 }, // 15 min fresh, 1h stale - market view
  homepage: { ttl: 900, swr: 3600 }, // 15 min fresh, 1h stale - homepage
} as const;

/**
 * Check if user is admin (for cache bypass).
 */
export async function isAdminForCache(): Promise<boolean> {
  try {
    const { getServerSession } = await import("next-auth");
    const { authOptions } = await import("@/src/lib/auth");
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) return false;
    const adminEmails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    return adminEmails.includes(session.user.email.toLowerCase());
  } catch {
    return false;
  }
}

