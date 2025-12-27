/**
 * PROMPT 61: KV checkpoint management
 * 
 * Manages cursor and last run stats in Vercel KV.
 */

import { kv } from "@vercel/kv";

const CURSOR_KEY = "national-ingest:cursor";
const LAST_RUN_KEY = "national-ingest:last-run";
const STATS_KEY = "national-ingest:stats";

export type CheckpointStats = {
  discovered: number;
  upserted: number;
  errors: number;
  lastRunAt: string;
  cursor: string | null;
};

/**
 * Read cursor from KV
 */
export async function readCursor(): Promise<string | null> {
  try {
    return await kv.get<string>(CURSOR_KEY);
  } catch (error) {
    console.error("[national-ingest] Error reading cursor:", error);
    return null;
  }
}

/**
 * Write cursor to KV
 */
export async function writeCursor(cursor: string | null): Promise<void> {
  try {
    if (cursor) {
      await kv.set(CURSOR_KEY, cursor, { ex: 60 * 60 * 24 * 7 }); // 7 days TTL
    } else {
      await kv.del(CURSOR_KEY);
    }
  } catch (error) {
    console.error("[national-ingest] Error writing cursor:", error);
  }
}

/**
 * Read last run stats
 */
export async function readLastRunStats(): Promise<CheckpointStats | null> {
  try {
    const stats = await kv.get<CheckpointStats>(STATS_KEY);
    return stats;
  } catch (error) {
    console.error("[national-ingest] Error reading last run stats:", error);
    return null;
  }
}

/**
 * Write last run stats
 */
export async function writeLastRunStats(stats: CheckpointStats): Promise<void> {
  try {
    await kv.set(STATS_KEY, stats, { ex: 60 * 60 * 24 * 7 }); // 7 days TTL
    await kv.set(LAST_RUN_KEY, new Date().toISOString(), { ex: 60 * 60 * 24 * 7 });
  } catch (error) {
    console.error("[national-ingest] Error writing last run stats:", error);
  }
}

/**
 * Reset cursor (admin operation)
 */
export async function resetCursor(): Promise<void> {
  try {
    await kv.del(CURSOR_KEY);
  } catch (error) {
    console.error("[national-ingest] Error resetting cursor:", error);
    throw error;
  }
}

