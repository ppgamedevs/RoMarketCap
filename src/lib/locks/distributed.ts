import { kv } from "@vercel/kv";

export type LockOptions = {
  ttl?: number; // Lock TTL in seconds (default: 300 = 5 minutes)
  retryDelay?: number; // Delay between retries in ms (default: 100)
  maxRetries?: number; // Max retry attempts (default: 10)
};

const DEFAULT_TTL = 300; // 5 minutes
const DEFAULT_RETRY_DELAY = 100;
const DEFAULT_MAX_RETRIES = 10;

/**
 * Acquire a distributed lock.
 * Returns lock ID if acquired, null if already held.
 */
export async function acquireLock(lockKey: string, options: LockOptions = {}): Promise<string | null> {
  const ttl = options.ttl ?? DEFAULT_TTL;
  const lockId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const kvKey = `lock:${lockKey}`;

  try {
    // Try to set the lock (only if it doesn't exist)
    const result = await kv.set(kvKey, lockId, {
      nx: true, // Only set if not exists
      ex: ttl, // Expire after TTL
    });

    if (result === "OK") {
      return lockId;
    }

    // Lock already held
    return null;
  } catch (error) {
    console.error(`[lock] Error acquiring lock ${lockKey}:`, error);
    return null;
  }
}

/**
 * Release a distributed lock.
 * Only releases if lockId matches (prevents releasing someone else's lock).
 */
export async function releaseLock(lockKey: string, lockId: string): Promise<boolean> {
  const kvKey = `lock:${lockKey}`;

  try {
    const current = await kv.get<string>(kvKey);
    if (current !== lockId) {
      // Lock was already released or taken by someone else
      return false;
    }

    await kv.del(kvKey);
    return true;
  } catch (error) {
    console.error(`[lock] Error releasing lock ${lockKey}:`, error);
    return false;
  }
}

/**
 * Check if a lock is currently held.
 */
export async function isLockHeld(lockKey: string): Promise<boolean> {
  const kvKey = `lock:${lockKey}`;
  try {
    const value = await kv.get<string>(kvKey);
    return value != null;
  } catch (error) {
    console.error(`[lock] Error checking lock ${lockKey}:`, error);
    return false;
  }
}

/**
 * Get lock holder ID (if any).
 */
export async function getLockHolder(lockKey: string): Promise<string | null> {
  const kvKey = `lock:${lockKey}`;
  try {
    return await kv.get<string>(kvKey);
  } catch (error) {
    console.error(`[lock] Error getting lock holder for ${lockKey}:`, error);
    return null;
  }
}

/**
 * Execute a function with a distributed lock.
 * Automatically acquires, executes, and releases the lock.
 */
export async function withLock<T>(
  lockKey: string,
  fn: () => Promise<T>,
  options: LockOptions = {},
): Promise<T> {
  const lockId = await acquireLock(lockKey, options);
  if (!lockId) {
    throw new Error(`Failed to acquire lock: ${lockKey}`);
  }

  try {
    return await fn();
  } finally {
    await releaseLock(lockKey, lockId);
  }
}

/**
 * Try to acquire a lock with retries.
 */
export async function acquireLockWithRetry(
  lockKey: string,
  options: LockOptions = {},
): Promise<string | null> {
  const retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const lockId = await acquireLock(lockKey, options);
    if (lockId) {
      return lockId;
    }

    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  return null;
}

