/**
 * PROMPT 55: Ingest a single source record
 * 
 * Handles matching, merging, and upserting a single record
 */

import { prisma } from "@/src/lib/db";
import type { SourceCompanyRecord, CompanyPatch } from "./types";
import {
  computeCompanyIdentityCandidates,
  chooseBestCompanyMatch,
  buildCompanyPatch,
} from "./merge";
import { makeCompanySlug } from "@/src/lib/slug";
import { hashRow } from "@/src/lib/ingestion/provenance";
import { Prisma } from "@prisma/client";

/**
 * Result of ingesting one record
 */
export type IngestOneResult = {
  companyId: string;
  created: boolean;
  updated: boolean;
  materialChange: boolean; // True if significant fields changed
  error?: string;
};

/**
 * Cap raw payload size (8KB)
 */
const MAX_RAW_SIZE = 8 * 1024;

function capRawPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const json = JSON.stringify(raw);
  if (Buffer.byteLength(json, "utf8") <= MAX_RAW_SIZE) {
    return raw;
  }

  // Truncate by removing keys until under limit
  const capped: Record<string, unknown> = {};
  const keys = Object.keys(raw).sort();
  
  for (const key of keys) {
    const test = { ...capped, [key]: raw[key] };
    const testJson = JSON.stringify(test);
    if (Buffer.byteLength(testJson, "utf8") <= MAX_RAW_SIZE) {
      capped[key] = raw[key];
    } else {
      break;
    }
  }

  return capped;
}

/**
 * Cap field provenance size (ensure it doesn't exceed reasonable limits)
 */
function capFieldProvenance(provenance: Record<string, unknown>): Record<string, unknown> {
  // Limit to 50 fields max
  const entries = Object.entries(provenance);
  if (entries.length <= 50) {
    return provenance;
  }

  // Keep most recent entries
  const sorted = entries.sort((a, b) => {
    const aSeen = (a[1] as { seenAt?: Date })?.seenAt?.getTime() || 0;
    const bSeen = (b[1] as { seenAt?: Date })?.seenAt?.getTime() || 0;
    return bSeen - aSeen;
  });

  return Object.fromEntries(sorted.slice(0, 50));
}

/**
 * Ingest a single source record
 */
export async function ingestOne(record: SourceCompanyRecord): Promise<IngestOneResult> {
  try {
    // Validate CUI if present
    if (record.cui) {
      const { isValidCuiFormat } = await import("@/src/lib/cui/normalize");
      if (!isValidCuiFormat(record.cui)) {
        return {
          companyId: "",
          created: false,
          updated: false,
          materialChange: false,
          error: "Invalid CUI format",
        };
      }
    }

    // Find matching company
    const candidates = computeCompanyIdentityCandidates(record);
    const match = await chooseBestCompanyMatch(candidates);

    // Build patch
    const patch = buildCompanyPatch(record);

    // Cap raw payload
    const cappedRaw = capRawPayload(record.raw);

    // Cap field provenance
    const cappedProvenance = patch.provenance ? capFieldProvenance(patch.provenance as Record<string, unknown>) : undefined;

    if (match) {
      // Update existing company
      const existing = await prisma.company.findUnique({
        where: { id: match.id },
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

      if (!existing) {
        return {
          companyId: match.id,
          created: false,
          updated: false,
          materialChange: false,
          error: "Company not found",
        };
      }

      // Check if we have approved data (don't overwrite)
      const hasApprovedData = existing.claims.length > 0 || existing.submissions.length > 0;
      const hasHighConfidence = (existing.dataConfidence ?? 0) >= 70;

      // Build update data (respect approved data)
      const updateData: Prisma.CompanyUpdateInput = {
        lastSeenAtFromSources: new Date(),
      };

      // Only update fields if no approved data or confidence is higher
      const canUpdate = !hasApprovedData || record.confidence > (existing.dataConfidence ?? 0);

      if (canUpdate) {
        if (patch.name && (!existing.name || existing.name !== patch.name)) {
          updateData.name = patch.name;
          if (!hasApprovedData) {
            updateData.legalName = patch.name;
          }
        }

        if (patch.domain && (!existing.domain || existing.domain !== patch.domain)) {
          updateData.domain = patch.domain;
        }

        if (patch.address && (!existing.address || existing.address !== patch.address)) {
          updateData.address = patch.address;
        }

        if (patch.countySlug && (!existing.countySlug || existing.countySlug !== patch.countySlug)) {
          updateData.countySlug = patch.countySlug;
        }

        if (patch.industrySlug && (!existing.industrySlug || existing.industrySlug !== patch.industrySlug)) {
          updateData.industrySlug = patch.industrySlug;
        }

        if (patch.employees != null && (!existing.employees || existing.employees !== patch.employees)) {
          updateData.employees = patch.employees;
        }

        if (patch.revenueLatest != null) {
          const existingRevenue = existing.revenueLatest ? Number(existing.revenueLatest) : null;
          const patchRevenue = typeof patch.revenueLatest === 'number' ? patch.revenueLatest : Number(patch.revenueLatest);
          if (!existingRevenue || existingRevenue !== patchRevenue) {
            updateData.revenueLatest = patch.revenueLatest;
          }
        }

        if (patch.profitLatest != null) {
          const existingProfit = existing.profitLatest ? Number(existing.profitLatest) : null;
          const patchProfit = typeof patch.profitLatest === 'number' ? patch.profitLatest : Number(patch.profitLatest);
          if (!existingProfit || existingProfit !== patchProfit) {
            updateData.profitLatest = patch.profitLatest;
          }
        }

        if (patch.email && (!existing.email || existing.email !== patch.email)) {
          updateData.email = patch.email;
        }

        if (patch.phone && (!existing.phone || existing.phone !== patch.phone)) {
          updateData.phone = patch.phone;
        }

        if (patch.website && (!existing.website || existing.website !== patch.website)) {
          updateData.website = patch.website;
        }

        // Update confidence if higher
        if (record.confidence > (existing.dataConfidence ?? 0)) {
          updateData.dataConfidence = Math.min(100, record.confidence);
        }
      }

      // Always update field provenance (merge with existing)
      const existingProvenance = (existing.fieldProvenance as Record<string, unknown>) || {};
      const mergedProvenance = { ...existingProvenance, ...cappedProvenance };
      updateData.fieldProvenance = capFieldProvenance(mergedProvenance) as Prisma.InputJsonValue;

      // Check for material changes
      const materialFields: Array<keyof Prisma.CompanyUpdateInput> = ["name", "domain", "industrySlug", "countySlug", "employees", "revenueLatest", "profitLatest"];
      const materialChange = materialFields.some((field) => (updateData as Record<string, unknown>)[field] !== undefined);

      // Update company
      await prisma.company.update({
        where: { id: match.id },
        data: updateData,
      });

      // Create/update provenance record
      const rowHash = hashRow(cappedRaw);
      await prisma.companyProvenance.upsert({
        where: {
          company_provenance_unique: {
            companyId: match.id,
            sourceName: record.sourceId,
            rowHash,
          },
        },
        create: {
          companyId: match.id,
          sourceName: record.sourceId,
          rowHash,
          discoverySource: record.sourceId as any,
          evidenceUrl: (record.raw.url as string) || undefined,
          confidenceScore: record.confidence,
          firstSeenAt: record.lastSeenAt,
          lastSeenAt: record.lastSeenAt,
          rawJson: cappedRaw as Prisma.InputJsonValue,
          externalId: record.sourceRef,
        },
        update: {
          lastSeenAt: record.lastSeenAt,
          evidenceUrl: (record.raw.url as string) || undefined,
        },
      });

      return {
        companyId: match.id,
        created: false,
        updated: Object.keys(updateData).length > 1, // More than just lastSeenAtFromSources
        materialChange,
      };
    } else {
      // Create new company
      if (!record.cui || !record.name) {
        return {
          companyId: "",
          created: false,
          updated: false,
          materialChange: false,
          error: "Missing CUI or name",
        };
      }

      const slug = makeCompanySlug(record.name, record.cui);
      const existingSlug = await prisma.company.findUnique({ where: { slug } });
      const finalSlug = existingSlug ? `${slug}-${record.cui.toLowerCase()}` : slug;

      const company = await prisma.company.create({
        data: {
          slug: finalSlug,
          name: patch.name || record.name,
          legalName: patch.name || record.name,
          cui: record.cui,
          country: "RO",
          isPublic: true,
          visibilityStatus: "PUBLIC",
          sourceConfidence: record.confidence,
          dataConfidence: record.confidence,
          isActive: true,
          domain: patch.domain,
          address: patch.address,
          countySlug: patch.countySlug,
          industrySlug: patch.industrySlug,
          employees: patch.employees,
          revenueLatest: patch.revenueLatest,
          profitLatest: patch.profitLatest,
          email: patch.email,
          phone: patch.phone,
          website: patch.website,
          fieldProvenance: cappedProvenance as Prisma.InputJsonValue,
          lastSeenAtFromSources: new Date(),
        },
      });

      // Create provenance record
      const rowHash = hashRow(cappedRaw);
      await prisma.companyProvenance.create({
        data: {
          companyId: company.id,
          sourceName: record.sourceId,
          rowHash,
          discoverySource: record.sourceId as any,
          evidenceUrl: (record.raw.url as string) || undefined,
          confidenceScore: record.confidence,
          firstSeenAt: record.lastSeenAt,
          lastSeenAt: record.lastSeenAt,
          rawJson: cappedRaw as Prisma.InputJsonValue,
          externalId: record.sourceRef,
        },
      });

      return {
        companyId: company.id,
        created: true,
        updated: false,
        materialChange: true, // New company is always material
      };
    }
  } catch (error) {
    return {
      companyId: "",
      created: false,
      updated: false,
      materialChange: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

