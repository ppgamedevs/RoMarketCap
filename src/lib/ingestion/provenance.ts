import { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "crypto";
import { normalizeCUI, isValidCUI } from "./cuiValidation";
import { slugifyCompanyName, makeCompanySlug } from "../slug";

// Export prisma instance for testing
export const prisma = new PrismaClient();

export type NationalIngestionRow = {
  name: string;
  cui: string | null;
  contractValue?: number | string | null;
  contractYear?: number | string | null;
  contractingAuthority?: string | null;
  externalId?: string | null;
  [key: string]: unknown; // Allow additional fields
};

export type ProvenanceUpsertResult = {
  companyId: string;
  created: boolean;
  provenanceCreated: boolean;
  provenanceUpdated: boolean;
};

/**
 * Hash a row to create a stable identifier for deduplication.
 */
export function hashRow(row: Record<string, unknown>): string {
  const normalized = JSON.stringify(row, Object.keys(row).sort());
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

/**
 * Upsert a company by CUI, creating a minimal shell if missing.
 * Does NOT overwrite existing company core fields.
 */
export async function upsertCompanyByCUI(
  row: NationalIngestionRow,
  sourceName: string,
): Promise<{ companyId: string; created: boolean }> {
  const cui = normalizeCUI(row.cui);
  if (!cui || !isValidCUI(cui)) {
    throw new Error(`Invalid CUI: ${row.cui}`);
  }

  const name = row.name.trim();
  if (!name || name.length < 2) {
    throw new Error(`Invalid company name: ${name}`);
  }

  // Try to find existing company by CUI
  const existing = await prisma.company.findUnique({ where: { cui } });

  if (existing) {
    // Company exists - don't overwrite, just return
    return { companyId: existing.id, created: false };
  }

  // Create minimal company shell
  const slug = makeCompanySlug(name, cui);
  const existingSlug = await prisma.company.findUnique({ where: { slug } });
  const finalSlug = existingSlug ? `${slug}-${cui.toLowerCase()}` : slug;

  const company = await prisma.company.create({
    data: {
      slug: finalSlug,
      name,
      legalName: name,
      cui,
      country: "RO",
      isPublic: true,
      visibilityStatus: "PUBLIC",
      sourceConfidence: 40, // Lower confidence for discovered companies
      isActive: true,
    },
  });

  return { companyId: company.id, created: true };
}

/**
 * Upsert provenance record for a company.
 * Tracks firstSeenAt, lastSeenAt, and aggregates totalValue.
 */
export async function upsertProvenance(
  companyId: string,
  row: NationalIngestionRow,
  sourceName: string,
  rawJson: Record<string, unknown>,
): Promise<{ created: boolean; updated: boolean }> {
  const rowHash = hashRow(rawJson);
  const externalId = row.externalId?.toString().trim() || null;

  // Parse contract value
  let contractValue: Prisma.Decimal | null = null;
  if (row.contractValue != null) {
    const num = typeof row.contractValue === "string" ? parseFloat(row.contractValue) : row.contractValue;
    if (!isNaN(num) && num > 0) {
      contractValue = new Prisma.Decimal(num);
    }
  }

  // Parse contract year
  let contractYear: number | null = null;
  if (row.contractYear != null) {
    const year = typeof row.contractYear === "string" ? parseInt(row.contractYear, 10) : row.contractYear;
    if (!isNaN(year) && year >= 2000 && year <= new Date().getFullYear() + 1) {
      contractYear = year;
    }
  }

  const contractingAuthority = row.contractingAuthority?.toString().trim() || null;

  // Check if provenance already exists
  const existing = await prisma.companyProvenance.findUnique({
    where: {
      company_provenance_unique: {
        companyId,
        sourceName,
        rowHash,
      },
    },
  });

  if (existing) {
    // Update lastSeenAt and potentially contractValue if it's higher
    const updates: Prisma.CompanyProvenanceUpdateInput = {
      lastSeenAt: new Date(),
    };

    if (contractValue && (!existing.contractValue || contractValue.gt(existing.contractValue))) {
      updates.contractValue = contractValue;
    }

    if (contractYear && (!existing.contractYear || contractYear > existing.contractYear)) {
      updates.contractYear = contractYear;
    }

    if (contractingAuthority && !existing.contractingAuthority) {
      updates.contractingAuthority = contractingAuthority;
    }

    await prisma.companyProvenance.update({
      where: { id: existing.id },
      data: updates,
    });

    return { created: false, updated: true };
  }

  // Create new provenance record
  await prisma.companyProvenance.create({
    data: {
      companyId,
      sourceName,
      externalId,
      rowHash,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
      contractValue,
      contractYear,
      contractingAuthority,
      rawJson: rawJson as Prisma.InputJsonValue,
    },
  });

  return { created: true, updated: false };
}

/**
 * Aggregate totalValue for a company from all provenance records.
 */
export async function aggregateProvenanceTotal(companyId: string): Promise<void> {
  const aggregations = await prisma.companyProvenance.groupBy({
    by: ["companyId"],
    where: { companyId, contractValue: { not: null } },
    _sum: { contractValue: true },
  });

  const total = aggregations[0]?._sum.contractValue || null;

  // Update all provenance records for this company with the aggregated total
  if (total) {
    await prisma.companyProvenance.updateMany({
      where: { companyId },
      data: { totalValue: total },
    });
  }
}

/**
 * Process a single national ingestion row.
 */
export async function processNationalIngestionRow(
  row: NationalIngestionRow,
  sourceName: string,
  rawJson: Record<string, unknown>,
): Promise<ProvenanceUpsertResult> {
  // Validate CUI
  if (!row.cui || !isValidCUI(row.cui)) {
    throw new Error(`Invalid or missing CUI: ${row.cui}`);
  }

  // Upsert company
  const { companyId, created } = await upsertCompanyByCUI(row, sourceName);

  // Upsert provenance
  const { created: provCreated, updated: provUpdated } = await upsertProvenance(companyId, row, sourceName, rawJson);

  // Aggregate total value
  await aggregateProvenanceTotal(companyId);

  return {
    companyId,
    created,
    provenanceCreated: provCreated,
    provenanceUpdated: provUpdated,
  };
}

