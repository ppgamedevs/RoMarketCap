/**
 * PROMPT 58: Dead-letter queue for financial sync failures
 */

import { kv } from "@vercel/kv";

export type FinancialDeadLetterEntry = {
  cui: string;
  reason: string;
  timestamp: number;
  attempt: number;
};

const DEAD_LETTER_KEY = "financial:deadletter";
const MAX_ENTRIES = 500;

/**
 * Add a failed financial sync to the dead-letter queue.
 */
export async function addFinancialDeadLetter(cui: string, reason: string, attempt = 1): Promise<void> {
  try {
    const entry: FinancialDeadLetterEntry = {
      cui,
      reason,
      timestamp: Date.now(),
      attempt,
    };

    // Get current list
    const current = await kv.lrange<FinancialDeadLetterEntry>(DEAD_LETTER_KEY, 0, MAX_ENTRIES - 1);
    const updated = [entry, ...current].slice(0, MAX_ENTRIES);

    // Replace list (keep only last MAX_ENTRIES)
    await kv.del(DEAD_LETTER_KEY);
    if (updated.length > 0) {
      await kv.rpush(DEAD_LETTER_KEY, ...updated);
    }
  } catch (error) {
    console.error(`[financial-deadletter] Error adding entry for CUI ${cui}:`, error);
  }
}

/**
 * Get dead-letter entries (most recent first).
 */
export async function getFinancialDeadLetters(limit = 100): Promise<FinancialDeadLetterEntry[]> {
  try {
    const entries = await kv.lrange<FinancialDeadLetterEntry>(DEAD_LETTER_KEY, 0, limit - 1);
    return entries;
  } catch (error) {
    console.error(`[financial-deadletter] Error getting entries:`, error);
    return [];
  }
}

/**
 * Remove a dead-letter entry (when retried successfully).
 */
export async function removeFinancialDeadLetter(cui: string): Promise<void> {
  try {
    const entries = await kv.lrange<FinancialDeadLetterEntry>(DEAD_LETTER_KEY, 0, MAX_ENTRIES - 1);
    const filtered = entries.filter((e) => e.cui !== cui);

    await kv.del(DEAD_LETTER_KEY);
    if (filtered.length > 0) {
      await kv.rpush(DEAD_LETTER_KEY, ...filtered);
    }
  } catch (error) {
    console.error(`[financial-deadletter] Error removing entry for CUI ${cui}:`, error);
  }
}

/**
 * Clear all dead-letter entries.
 */
export async function clearFinancialDeadLetters(): Promise<void> {
  try {
    await kv.del(DEAD_LETTER_KEY);
  } catch (error) {
    console.error(`[financial-deadletter] Error clearing entries:`, error);
  }
}

