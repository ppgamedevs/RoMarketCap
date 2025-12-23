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
 */
export async function getOrSetPageCache<T>(
  key: PageCacheKey,
  compute: () => Promise<T>,
  options?: CacheOptions,
): Promise<T> {
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
 */
export const PAGE_CACHE_TTLS = {
  company: { ttl: 600, swr: 3600 }, // 10 min fresh, 1h stale
  list: { ttl: 300, swr: 1800 }, // 5 min fresh, 30 min stale
  taxonomy: { ttl: 1800, swr: 7200 }, // 30 min fresh, 2h stale
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

