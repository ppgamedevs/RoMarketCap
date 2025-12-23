import { kv } from "@vercel/kv";

export type DeadLetterEntry = {
  cui: string;
  reason: string;
  timestamp: number;
  attempt: number;
};

const DEAD_LETTER_KEY = "enrichment:deadletter";
const MAX_ENTRIES = 500;

/**
 * Add a failed enrichment to the dead-letter queue.
 */
export async function addDeadLetter(cui: string, reason: string, attempt = 1): Promise<void> {
  try {
    const entry: DeadLetterEntry = {
      cui,
      reason,
      timestamp: Date.now(),
      attempt,
    };

    // Get current list
    const current = await kv.lrange<DeadLetterEntry>(DEAD_LETTER_KEY, 0, MAX_ENTRIES - 1);
    const updated = [entry, ...current].slice(0, MAX_ENTRIES);

    // Replace list (keep only last MAX_ENTRIES)
    await kv.del(DEAD_LETTER_KEY);
    if (updated.length > 0) {
      await kv.rpush(DEAD_LETTER_KEY, ...updated);
    }
  } catch (error) {
    console.error(`[deadletter] Error adding entry for CUI ${cui}:`, error);
  }
}

/**
 * Get dead-letter entries (most recent first).
 */
export async function getDeadLetters(limit = 100): Promise<DeadLetterEntry[]> {
  try {
    const entries = await kv.lrange<DeadLetterEntry>(DEAD_LETTER_KEY, 0, limit - 1);
    return entries;
  } catch (error) {
    console.error(`[deadletter] Error getting entries:`, error);
    return [];
  }
}

/**
 * Remove a dead-letter entry (when retried successfully).
 */
export async function removeDeadLetter(cui: string): Promise<void> {
  try {
    const entries = await kv.lrange<DeadLetterEntry>(DEAD_LETTER_KEY, 0, MAX_ENTRIES - 1);
    const filtered = entries.filter((e) => e.cui !== cui);

    await kv.del(DEAD_LETTER_KEY);
    if (filtered.length > 0) {
      await kv.rpush(DEAD_LETTER_KEY, ...filtered);
    }
  } catch (error) {
    console.error(`[deadletter] Error removing entry for CUI ${cui}:`, error);
  }
}

/**
 * Clear all dead-letter entries.
 */
export async function clearDeadLetters(): Promise<void> {
  try {
    await kv.del(DEAD_LETTER_KEY);
  } catch (error) {
    console.error(`[deadletter] Error clearing entries:`, error);
  }
}

