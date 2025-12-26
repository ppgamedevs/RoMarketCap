/**
 * PROMPT 53: Provider Ingestion Engine
 * 
 * Handles fetching, normalizing, validating, and upserting provider data.
 * Implements merge policy to never overwrite high-confidence data.
 */

import { z } from "zod";
import { prisma } from "@/src/lib/db";
import type { IngestionProvider, NormalizedCompanyRecord, ProviderCompanyItem } from "./types";
import { sanitizePayload, sha256StableJson } from "./sanitize";
import { normalizeCUI, isValidCUI } from "../ingestion/cuiValidation";
import { makeCompanySlug } from "@/src/lib/slug";
import { logChange } from "@/src/lib/changelog/logChange";

/**
 * Validation schema for normalized records
 */
const NormalizedRecordSchema = z.object({
  cui: z.string().min(1),
  name: z.string().min(2),
  domain: z.string().url().optional().or(z.literal("")),
  address: z.string().optional(),
  countySlug: z.string().optional(),
  industrySlug: z.string().optional(),
  employees: z.number().int().positive().optional(),
  revenueLatest: z.number().nonnegative().optional(),
  profitLatest: z.number().optional(),
  currency: z.string().optional(),
  year: z.number().int().positive().optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  confidence: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  descriptionShort: z.string().max(240).optional(),
  socials: z.record(z.string()).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
});

/**
 * Ingestion statistics
 */
export type IngestionStats = {
  itemsFetched: number;
  itemsUpserted: number;
  itemsRejected: number;
  errors: Array<{ item: unknown; error: string }>;
};

/**
 * Ingestion options
 */
export type IngestionOptions = {
  dryRun?: boolean;
  runId?: string;
  providerId: string;
};

/**
 * Upsert company with merge policy
 * 
 * Rules:
 * - Never overwrite manually approved values (claims/submissions)
 * - Never overwrite high-confidence data unless provider confidence is higher
 * - Always update low-confidence or missing fields
 */
async function upsertCompanyWithMerge(
  record: NormalizedCompanyRecord,
  providerId: string,
  providerConfidence: number,
): Promise<{ companyId: string; created: boolean; updated: boolean }> {
  const cui = normalizeCUI(record.cui);
  if (!cui || !isValidCUI(cui)) {
    throw new Error(`Invalid CUI: ${record.cui}`);
  }

  const existing = await prisma.company.findUnique({
    where: { cui },
    include: {
      claims: {
        where: { status: "APPROVED" },
        take: 1,
      },
      submissions: {
        where: { status: "APPROVED" },
        take: 1,
      },
    },
  });

  const hasApprovedData = existing && (existing.claims.length > 0 || existing.submissions.length > 0);
  const hasHighConfidence = existing && (existing.dataConfidence ?? 0) >= 70;

  // Build update data with merge policy
  const updateData: {
    name?: string;
    legalName?: string;
    domain?: string;
    address?: string;
    countySlug?: string;
    industrySlug?: string;
    employees?: number;
    revenueLatest?: number;
    profitLatest?: number;
    currency?: string;
    descriptionShort?: string;
    phone?: string;
    email?: string;
    dataConfidence?: number;
  } = {};

  // Only update if no approved data or provider confidence is higher
  const canUpdateName = !hasApprovedData || providerConfidence > (existing.dataConfidence ?? 0);
  const canUpdateCore = !hasHighConfidence || providerConfidence > (existing.dataConfidence ?? 0);

  if (canUpdateName && record.name && (!existing?.name || existing.name !== record.name)) {
    updateData.name = record.name;
    updateData.legalName = record.name;
  }

  if (canUpdateCore) {
    if (record.domain && (!existing?.domain || existing.domain !== record.domain)) {
      updateData.domain = record.domain;
    }
    if (record.address && (!existing?.address || existing.address !== record.address)) {
      updateData.address = record.address;
    }
    if (record.countySlug && (!existing?.countySlug || existing.countySlug !== record.countySlug)) {
      updateData.countySlug = record.countySlug;
    }
    if (record.industrySlug && (!existing?.industrySlug || existing.industrySlug !== record.industrySlug)) {
      updateData.industrySlug = record.industrySlug;
    }
    if (record.employees != null && (!existing?.employees || existing.employees !== record.employees)) {
      updateData.employees = record.employees;
    }
    if (record.revenueLatest != null && (!existing?.revenueLatest || existing.revenueLatest !== record.revenueLatest)) {
      updateData.revenueLatest = record.revenueLatest;
    }
    if (record.profitLatest != null && (!existing?.profitLatest || existing.profitLatest !== record.profitLatest)) {
      updateData.profitLatest = record.profitLatest;
    }
    if (record.descriptionShort && (!existing?.descriptionShort || existing.descriptionShort !== record.descriptionShort)) {
      updateData.descriptionShort = record.descriptionShort;
    }
    if (record.phone && (!existing?.phone || existing.phone !== record.phone)) {
      updateData.phone = record.phone;
    }
    if (record.email && (!existing?.email || existing.email !== record.email)) {
      updateData.email = record.email;
    }
  }

  // Update confidence if provider confidence is higher
  if (providerConfidence > (existing?.dataConfidence ?? 0)) {
    updateData.dataConfidence = Math.min(100, providerConfidence);
  }

  if (existing) {
    // Update existing company
    const hasUpdates = Object.keys(updateData).length > 0;
    if (hasUpdates) {
      await prisma.company.update({
        where: { id: existing.id },
        data: updateData,
      });

      // Log important changes
      const importantFields = ["name", "domain", "industrySlug", "countySlug", "employees", "revenueLatest", "profitLatest"];
      const changedFields = importantFields.filter((field) => updateData[field as keyof typeof updateData] !== undefined);
      
      if (changedFields.length > 0) {
        await logChange(existing.id, {
          type: "PROVIDER_UPDATE",
          fields: changedFields,
          source: providerId,
        }).catch(() => null); // Don't fail ingestion if logging fails
      }

      return { companyId: existing.id, created: false, updated: true };
    }
    return { companyId: existing.id, created: false, updated: false };
  }

  // Create new company
  const slug = makeCompanySlug(record.name, cui);
  const existingSlug = await prisma.company.findUnique({ where: { slug } });
  const finalSlug = existingSlug ? `${slug}-${cui.toLowerCase()}` : slug;

  const company = await prisma.company.create({
    data: {
      slug: finalSlug,
      name: record.name,
      legalName: record.name,
      cui,
      country: "RO",
      isPublic: true,
      visibilityStatus: "PUBLIC",
      sourceConfidence: providerConfidence,
      dataConfidence: providerConfidence,
      isActive: true,
      ...updateData,
    },
  });

  return { companyId: company.id, created: true, updated: false };
}

/**
 * Upsert provenance record
 */
async function upsertProvenance(
  companyId: string,
  record: NormalizedCompanyRecord,
  providerId: string,
  rawItem: ProviderCompanyItem,
  runId: string | undefined,
  payloadHash: string,
): Promise<{ created: boolean; updated: boolean }> {
  const rowHash = sha256StableJson(rawItem);

  const existing = await prisma.companyProvenance.findUnique({
    where: {
      company_provenance_unique: {
        companyId,
        sourceName: providerId,
        rowHash,
      },
    },
  });

  if (existing) {
    // Update lastSeenAt
    await prisma.companyProvenance.update({
      where: { id: existing.id },
      data: {
        lastSeenAt: new Date(),
        lastPayloadHash: payloadHash,
        runId: runId || null,
      },
    });
    return { created: false, updated: true };
  }

  // Create new provenance
  await prisma.companyProvenance.create({
    data: {
      companyId,
      sourceName: providerId,
      rowHash,
      providerId,
      runId: runId || null,
      lastPayloadHash: payloadHash,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      rawJson: record as unknown as Record<string, unknown>,
    },
  });

  return { created: true, updated: false };
}

/**
 * Store raw snapshot
 */
async function storeRawSnapshot(
  providerId: string,
  cui: string | null,
  rawItem: ProviderCompanyItem,
  runId: string,
): Promise<void> {
  const { sanitized, sizeBytes } = sanitizePayload(rawItem);
  const payloadHash = sha256StableJson(sanitized);

  // Check if snapshot already exists (dedupe by hash)
  const existing = await prisma.providerRawSnapshot.findFirst({
    where: {
      providerId,
      payloadHash,
    },
  });

  if (existing) {
    return; // Skip duplicate
  }

  await prisma.providerRawSnapshot.create({
    data: {
      providerId,
      cui: cui || null,
      payloadHash,
      payloadJson: sanitized as Record<string, unknown>,
      sizeBytes,
      runId,
    },
  });
}

/**
 * Ingest a page from a provider
 */
export async function ingestProviderPage(
  provider: IngestionProvider,
  cursor: string | undefined,
  limit: number,
  options: IngestionOptions,
): Promise<{ cursorOut: string | undefined; stats: IngestionStats }> {
  const stats: IngestionStats = {
    itemsFetched: 0,
    itemsUpserted: 0,
    itemsRejected: 0,
    errors: [],
  };

  // Fetch page from provider
  const pageResult = await provider.fetchPage({ cursor, limit });
  stats.itemsFetched = pageResult.items.length;

  // Process each item
  for (const item of pageResult.items) {
    try {
      // Normalize
      const normalized = provider.normalize(item);
      if (!normalized) {
        stats.itemsRejected++;
        stats.errors.push({ item, error: "Normalization returned null" });
        continue;
      }

      // Validate
      const validationResult = NormalizedRecordSchema.safeParse(normalized);
      if (!validationResult.success) {
        stats.itemsRejected++;
        stats.errors.push({
          item,
          error: `Validation failed: ${validationResult.error.message}`,
        });
        continue;
      }

      const record = validationResult.data;
      const providerConfidence = record.confidence ?? 70;

      if (!options.dryRun) {
        // Upsert company
        const { companyId, created } = await upsertCompanyWithMerge(record, options.providerId, providerConfidence);

        // Upsert provenance
        const payloadHash = sha256StableJson(item);
        await upsertProvenance(companyId, record, options.providerId, item, options.runId, payloadHash);

        // Store raw snapshot
        await storeRawSnapshot(options.providerId, record.cui, item, options.runId!);

        if (created) {
          stats.itemsUpserted++;
        }
      } else {
        stats.itemsUpserted++; // Count as upserted in dry-run
      }
    } catch (error) {
      stats.itemsRejected++;
      stats.errors.push({
        item,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    cursorOut: pageResult.nextCursor,
    stats,
  };
}

