import { kv } from "@vercel/kv";

export type CacheOptions = {
  ttl?: number; // Time to live in seconds (default: 600 = 10 minutes)
  swr?: number; // Stale-while-revalidate in seconds (default: 3600 = 1 hour)
  version?: string; // Cache version for invalidation
};

const DEFAULT_TTL = 600; // 10 minutes
const DEFAULT_SWR = 3600; // 1 hour

/**
 * Get cached value from KV.
 * Returns null if not found or expired.
 */
export async function getCache<T>(key: string, version?: string): Promise<T | null> {
  try {
    const cacheKey = version ? `cache:${version}:${key}` : `cache:${key}`;
    const cached = await kv.get<{ data: T; expiresAt: number; staleAt: number }>(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    if (cached.expiresAt < now) {
      // Expired - delete and return null
      await kv.del(cacheKey).catch(() => null);
      return null;
    }

    return cached.data;
  } catch (error) {
    console.error(`[cache] Error getting key ${key}:`, error);
    return null;
  }
}

/**
 * Set cached value in KV with TTL and stale-while-revalidate.
 */
export async function setCache<T>(
  key: string,
  data: T,
  options: CacheOptions = {},
): Promise<void> {
  try {
    const ttl = options.ttl ?? DEFAULT_TTL;
    const swr = options.swr ?? DEFAULT_SWR;
    const version = options.version;
    const cacheKey = version ? `cache:${version}:${key}` : `cache:${key}`;

    const now = Date.now();
    const expiresAt = now + ttl * 1000;
    const staleAt = now + (ttl + swr) * 1000;

    await kv.set(
      cacheKey,
      { data, expiresAt, staleAt },
      {
        ex: ttl + swr, // Store for TTL + SWR duration
      },
    );
  } catch (error) {
    console.error(`[cache] Error setting key ${key}:`, error);
    // Don't throw - caching is best effort
  }
}

/**
 * Get cached value or compute and cache it.
 * If cache is stale but not expired, return stale data and revalidate in background.
 */
export async function getOrSetCache<T>(
  key: string,
  compute: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T> {
  const version = options.version;
  const cacheKey = version ? `cache:${version}:${key}` : `cache:${key}`;

  try {
    const cached = await kv.get<{ data: T; expiresAt: number; staleAt: number }>(cacheKey);
    if (cached) {
      const now = Date.now();
      if (cached.expiresAt >= now) {
        // Fresh - return immediately
        return cached.data;
      } else if (cached.staleAt >= now) {
        // Stale but usable - return stale data and revalidate in background
        compute()
          .then((fresh) => setCache(key, fresh, options))
          .catch((err) => console.error(`[cache] Background revalidation failed for ${key}:`, err));
        return cached.data;
      }
      // Expired - delete and compute fresh
      await kv.del(cacheKey).catch(() => null);
    }
  } catch (error) {
    console.error(`[cache] Error checking cache for ${key}:`, error);
  }

  // Compute fresh value
  const fresh = await compute();
  await setCache(key, fresh, options);
  return fresh;
}

/**
 * Invalidate cache by key pattern.
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    // Note: KV doesn't support pattern deletion directly
    // This is a placeholder - in production, you'd maintain a list of keys
    // or use a version bump to invalidate all caches
    console.warn(`[cache] Pattern invalidation not fully implemented for: ${pattern}`);
  } catch (error) {
    console.error(`[cache] Error invalidating pattern ${pattern}:`, error);
  }
}

