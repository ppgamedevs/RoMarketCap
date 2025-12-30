/**
 * PROMPT 61: Upsert companies from CUIs
 * 
 * Batch upserts companies with minimal required fields and provenance.
 */

import { prisma } from "@/src/lib/db";
import { Prisma } from "@prisma/client";
import { normalizeCUI } from "../cuiValidation";
import { writeFieldProvenance } from "../provenance";
import type { CUIWithProvenance } from "./sources";
import { slugifyCompanyName } from "@/src/lib/slug";
import { applyPostIngestionHooks } from "../postHooks";

const BATCH_SIZE = 50; // Process in batches to avoid timeouts
const CONCURRENT_TRANSACTIONS = 5; // Limit concurrent transactions to avoid DB overload

export type UpsertResult = {
  created: number;
  updated: number;
  errors: number;
  errorDetails: Array<{ cui: string; error: string }>;
};

/**
 * Upsert companies from CUIs with provenance
 */
export async function upsertCompaniesFromCuis(
  cuis: CUIWithProvenance[],
  dryRun: boolean = false
): Promise<UpsertResult> {
  const result: UpsertResult = {
    created: 0,
    updated: 0,
    errors: 0,
    errorDetails: [],
  };

  if (dryRun) {
    // In dry run, batch check existence to avoid N+1 queries
    const normalizedCuis = cuis.map(item => normalizeCUI(item.cui)).filter((c): c is string => !!c);
    if (normalizedCuis.length === 0) {
      return result;
    }
    
    // Batch check which CUIs already exist
    const existing = await prisma.company.findMany({
      where: { cui: { in: normalizedCuis } },
      select: { cui: true },
    });
    const existingCuis = new Set(existing.map(c => c.cui));
    
    // Count what would be created/updated
    for (const item of cuis) {
      const normalizedCui = normalizeCUI(item.cui);
      if (!normalizedCui) {
        result.errors++;
        continue;
      }
      if (existingCuis.has(normalizedCui)) {
        result.updated++;
      } else {
        result.created++;
      }
    }
    return result;
  }

  // Process in batches with limited concurrency to avoid transaction timeouts
  // This prevents one failure from aborting the entire batch
  for (let i = 0; i < cuis.length; i += BATCH_SIZE) {
    const batch = cuis.slice(i, i + BATCH_SIZE);
    
    // Process companies with limited concurrency to avoid DB overload
    for (let j = 0; j < batch.length; j += CONCURRENT_TRANSACTIONS) {
      const concurrentBatch = batch.slice(j, j + CONCURRENT_TRANSACTIONS);
      
      await Promise.allSettled(
        concurrentBatch.map(async (item) => {
        try {
          const normalizedCui = normalizeCUI(item.cui);
          if (!normalizedCui) {
            result.errors++;
            result.errorDetails.push({ cui: item.cui, error: "Invalid CUI" });
            return;
          }

          // Process each company in its own transaction
          await prisma.$transaction(async (tx) => {
            // Generate slug from name or CUI
            const slugBase = item.name || normalizedCui;
            const slug = slugifyCompanyName(slugBase) || `company-${normalizedCui.toLowerCase()}`;

            // Check if company exists
            const existing = await tx.company.findUnique({
              where: { cui: normalizedCui },
              select: { id: true, dataConfidence: true },
            });

            // Use name if available, otherwise use CUI as fallback (name is required in schema)
            const companyName = item.name || `Company ${normalizedCui}`;

            // Upsert company
            const company = await tx.company.upsert({
              where: { cui: normalizedCui },
              create: {
                cui: normalizedCui,
                name: companyName,
                legalName: companyName,
                slug,
                canonicalSlug: slug,
                isPublic: true,
                visibilityStatus: "PUBLIC",
                isSkeleton: false, // Explicitly set to false for national ingestion
                dataConfidence: item.confidence,
              },
              update: {
                // Only update if we have better data
                ...(item.name && item.confidence >= 60
                  ? {
                      name: item.name,
                      legalName: item.name,
                    }
                  : {}),
                dataConfidence: Math.max(
                  item.confidence,
                  existing?.dataConfidence || 0
                ),
              },
              select: { id: true, cui: true },
            });

            // Track if created or updated
            if (existing) {
              result.updated++;
            } else {
              result.created++;
            }

            // Create/update provenance
            if (item.sourceRef) {
              await tx.companyProvenance.upsert({
                where: {
                  company_provenance_unique: {
                    companyId: company.id,
                    sourceName: item.sourceType,
                    rowHash: item.sourceRef,
                  },
                },
                create: {
                  companyId: company.id,
                  sourceName: item.sourceType,
                  externalId: item.sourceRef,
                  firstSeenAt: new Date(),
                  lastSeenAt: new Date(),
                  rowHash: item.sourceRef,
                  rawJson: item.raw as Prisma.InputJsonValue,
                },
                update: {
                  lastSeenAt: new Date(),
                  rawJson: item.raw as Prisma.InputJsonValue,
                },
              });
            }

            // Write field provenance (outside transaction to avoid blocking)
            if (item.name && item.confidence >= 60) {
              writeFieldProvenance(
                company.id,
                "name",
                item.sourceType as any,
                item.sourceRef || normalizedCui,
                item.confidence,
                `national-ingest:${item.sourceType}`
              ).catch(() => null);
            }

            // Apply post-ingestion hooks (scoring, integrity, etc.)
            // Only for newly created companies to avoid unnecessary work on updates
            // Run outside transaction to avoid blocking and transaction abort issues
            if (!existing) {
              applyPostIngestionHooks(company.id).catch((error) => {
                console.error(`[national-ingest] Post-hooks failed for ${company.id}:`, error);
              });
            }
          });
        } catch (error) {
          result.errors++;
          result.errorDetails.push({
            cui: item.cui,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
        })
      );
    }
  }

  return result;
}

