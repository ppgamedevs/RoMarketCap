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

const BATCH_SIZE = 50; // Process in batches to avoid timeouts

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
    // In dry run, just count what would be created/updated
    for (const item of cuis) {
      const existing = await prisma.company.findUnique({
        where: { cui: item.cui },
        select: { id: true },
      });
      if (existing) {
        result.updated++;
      } else {
        result.created++;
      }
    }
    return result;
  }

  // Process in batches
  for (let i = 0; i < cuis.length; i += BATCH_SIZE) {
    const batch = cuis.slice(i, i + BATCH_SIZE);
    
    await prisma.$transaction(async (tx) => {
      for (const item of batch) {
        try {
          const normalizedCui = normalizeCUI(item.cui);
          if (!normalizedCui) {
            result.errors++;
            result.errorDetails.push({ cui: item.cui, error: "Invalid CUI" });
            continue;
          }

          // Generate slug from name or CUI
          const slugBase = item.name || normalizedCui;
          const slug = slugifyCompanyName(slugBase) || `company-${normalizedCui.toLowerCase()}`;

          // Check if company exists
          const existing = await tx.company.findUnique({
            where: { cui: normalizedCui },
            select: { id: true, dataConfidence: true },
          });

          // Upsert company
          const company = await tx.company.upsert({
            where: { cui: normalizedCui },
            create: {
              cui: normalizedCui,
              name: item.name || null,
              legalName: item.name || null,
              slug,
              canonicalSlug: slug,
              isPublic: true,
              visibilityStatus: "PUBLIC",
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

          // Write field provenance
          if (item.name && item.confidence >= 60) {
            await writeFieldProvenance(
              company.id,
              "name",
              item.sourceType as any,
              item.sourceRef || normalizedCui,
              item.confidence,
              `national-ingest:${item.sourceType}`
            ).catch(() => null);
          }
        } catch (error) {
          result.errors++;
          result.errorDetails.push({
            cui: item.cui,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }
    }, {
      timeout: 30000, // 30s timeout per batch
    });
  }

  return result;
}

