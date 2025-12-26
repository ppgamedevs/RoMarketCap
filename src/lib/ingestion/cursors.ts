/**
 * PROMPT 55: Cursor Management
 * 
 * Manages KV cursors per source for resumable ingestion
 */

import { kv } from "@vercel/kv";
import type { SourceId } from "./types";

/**
 * Get cursor for a source
 */
export async function getCursor(sourceId: SourceId): Promise<string | null> {
  const key = `ingest:cursor:${sourceId}`;
  return kv.get<string>(key).catch(() => null);
}

/**
 * Set cursor for a source
 */
export async function setCursor(sourceId: SourceId, cursor: string | null): Promise<void> {
  const key = `ingest:cursor:${sourceId}`;
  if (cursor) {
    await kv.set(key, cursor, { ex: 60 * 60 * 24 * 7 }).catch(() => null); // 7 days TTL
  } else {
    await kv.del(key).catch(() => null);
  }
}

/**
 * Get all cursors snapshot
 */
export async function getCursorsSnapshot(): Promise<Record<SourceId, string | null>> {
  const sources: SourceId[] = ["SEAP", "EU_FUNDS", "ANAF_VERIFY", "THIRD_PARTY"];
  const cursors: Record<string, string | null> = {};

  await Promise.all(
    sources.map(async (sourceId) => {
      cursors[sourceId] = await getCursor(sourceId);
    }),
  );

  return cursors as Record<SourceId, string | null>;
}

/**
 * Clear cursor for a source
 */
export async function clearCursor(sourceId: SourceId): Promise<void> {
  await setCursor(sourceId, null);
}

