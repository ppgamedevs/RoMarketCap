/**
 * PROMPT 55: Ingest a batch of records from a source
 * 
 * Processes multiple records with budget control
 */

import type { SourceId, SourceCompanyRecord } from "./types";
import type { IngestionBudget } from "./budget";
import { ingestOne } from "./ingestOne";
import { getCursor, setCursor } from "./cursors";
import { sourceRegistry } from "./sources";

/**
 * Batch ingestion result
 */
export type IngestBatchResult = {
  sourceId: SourceId;
  recordsSeen: number;
  recordsProcessed: number;
  companiesCreated: number;
  companiesUpdated: number;
  materialChanges: number;
  errors: number;
  nextCursor?: string;
  errorDetails: Array<{ sourceRef: string; error: string }>;
};

/**
 * Ingest a batch from a source
 */
export async function ingestBatch(
  sourceId: SourceId,
  budget: IngestionBudget,
  limit: number = 100,
): Promise<IngestBatchResult> {
  const source = sourceRegistry.get(sourceId);
  if (!source) {
    return {
      sourceId,
      recordsSeen: 0,
      recordsProcessed: 0,
      companiesCreated: 0,
      companiesUpdated: 0,
      materialChanges: 0,
      errors: 0,
      errorDetails: [{ sourceRef: "source", error: `Source ${sourceId} not found` }],
    };
  }

  // Get cursor
  const cursor = await getCursor(sourceId);

  // Fetch batch
  const { records, nextCursor } = await source.fetchBatch(cursor || undefined, limit);

  const result: IngestBatchResult = {
    sourceId,
    recordsSeen: records.length,
    recordsProcessed: 0,
    companiesCreated: 0,
    companiesUpdated: 0,
    materialChanges: 0,
    errors: 0,
    errorDetails: [],
  };

  // Process each record
  for (const record of records) {
    // Check budget
    if (!budget.recordsRemaining || Date.now() - budget.startTime >= budget.timeRemainingMs) {
      break;
    }

    // Ingest one record
    const ingestResult = await ingestOne(record);

    result.recordsProcessed++;

    if (ingestResult.error) {
      result.errors++;
      result.errorDetails.push({
        sourceRef: record.sourceRef,
        error: ingestResult.error,
      });
    } else if (ingestResult.created) {
      result.companiesCreated++;
      if (ingestResult.materialChange) {
        result.materialChanges++;
      }
    } else if (ingestResult.updated) {
      result.companiesUpdated++;
      if (ingestResult.materialChange) {
        result.materialChanges++;
      }
    }

    // Consume budget
    budget.recordsRemaining--;
  }

  // Update cursor
  if (nextCursor) {
    await setCursor(sourceId, nextCursor);
    result.nextCursor = nextCursor;
  } else if (records.length < limit) {
    // No more records, clear cursor
    await setCursor(sourceId, null);
  }

  return result;
}

