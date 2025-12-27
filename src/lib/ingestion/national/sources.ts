/**
 * PROMPT 61: Fetch CUIs from all sources
 * 
 * Collects company CUIs from SEAP, EU funds, providers, and ANAF verification results.
 */

import { sourceRegistry } from "../sources";
import type { SourceId } from "../types";
import { normalizeCUI } from "../cuiValidation";

export type CUIWithProvenance = {
  cui: string;
  sourceType: SourceId | "PROVIDER" | "ANAF";
  sourceRef: string | null;
  name: string | null;
  confidence: number;
  raw: Record<string, unknown> | null;
};

export type FetchCUIsResult = {
  cuis: CUIWithProvenance[];
  nextCursor: string | null;
  stats: {
    sourceId: SourceId | "PROVIDER" | "ANAF";
    discovered: number;
    valid: number;
    invalid: number;
  }[];
};

/**
 * Fetch CUIs from all enabled sources
 */
export async function fetchCUIsFromSources(options: {
  limit: number;
  cursor?: string | null;
}): Promise<FetchCUIsResult> {
  const { limit, cursor } = options;
  const cuis: CUIWithProvenance[] = [];
  const stats: FetchCUIsResult["stats"] = [];
  let nextCursor: string | null = null;

  // Get enabled sources
  const enabledSources = await sourceRegistry.getEnabled();
  
  // Per-source cursor management
  const sourceCursors: Record<string, string> = cursor ? JSON.parse(cursor) : {};
  const sourceLimits: Record<string, number> = {};
  
  // Distribute limit across sources (roughly equal)
  const limitPerSource = Math.max(1, Math.floor(limit / enabledSources.length));
  for (const source of enabledSources) {
    sourceLimits[source.sourceId] = limitPerSource;
  }

  // Fetch from each source
  for (const source of enabledSources) {
    const sourceCursor = sourceCursors[source.sourceId] || undefined;
    const sourceLimit = sourceLimits[source.sourceId] || limitPerSource;
    
    const sourceStats = {
      sourceId: source.sourceId as SourceId | "PROVIDER" | "ANAF",
      discovered: 0,
      valid: 0,
      invalid: 0,
    };

    try {
      const batch = await source.fetchBatch(sourceCursor, sourceLimit);
      
      for (const record of batch.records) {
        sourceStats.discovered++;
        
        // Normalize CUI
        const normalizedCui = normalizeCUI(record.cui);
        if (!normalizedCui) {
          sourceStats.invalid++;
          continue;
        }

        sourceStats.valid++;
        cuis.push({
          cui: normalizedCui,
          sourceType: record.sourceId,
          sourceRef: record.sourceRef || null,
          name: record.name || null,
          confidence: record.confidence || 50,
          raw: record.raw || null,
        });

        // Update cursor for this source
        if (batch.nextCursor) {
          sourceCursors[source.sourceId] = batch.nextCursor;
        }
      }

      // If this source has more data, we have a next cursor
      if (batch.nextCursor) {
        nextCursor = JSON.stringify(sourceCursors);
      }
    } catch (error) {
      console.error(`[national-ingest] Error fetching from ${source.sourceId}:`, error);
      // Continue with other sources
    }

    stats.push(sourceStats);
  }

  // Deduplicate by CUI (keep highest confidence)
  const cuiMap = new Map<string, CUIWithProvenance>();
  for (const item of cuis) {
    const existing = cuiMap.get(item.cui);
    if (!existing || item.confidence > existing.confidence) {
      cuiMap.set(item.cui, item);
    }
  }

  return {
    cuis: Array.from(cuiMap.values()),
    nextCursor,
    stats,
  };
}

