/**
 * Store provider data as provenance and signals
 * 
 * Never overwrites verified data - only adds new signals
 * with confidence weighting based on provider trust level.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import type { CompanyEnrichmentResult, CompanyMetricsResult } from "./types";
import { normalizeCUI } from "../ingestion/cuiValidation";

const prisma = new PrismaClient();

/**
 * Store enrichment data as provenance
 */
export async function storeEnrichmentAsProvenance(
  result: CompanyEnrichmentResult,
  providerId: string,
): Promise<void> {
  const cui = normalizeCUI(result.cui);
  if (!cui) {
    return;
  }

  // Find company by CUI
  const company = await prisma.company.findUnique({
    where: { cui },
  });

  if (!company) {
    // Company doesn't exist yet - could create minimal shell
    // But for now, we'll skip (discovery should handle this)
    return;
  }

  // Store as provenance (don't overwrite company fields)
  const rowHash = JSON.stringify(result.data);
  const existing = await prisma.companyProvenance.findUnique({
    where: {
      company_provenance_unique: {
        companyId: company.id,
        sourceName: providerId,
        rowHash,
      },
    },
  });

  if (!existing) {
    await prisma.companyProvenance.create({
      data: {
        companyId: company.id,
        sourceName: providerId,
        rowHash,
        rawJson: result.data as Prisma.InputJsonValue,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      },
    });
  } else {
    await prisma.companyProvenance.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date() },
    });
  }
}

/**
 * Store metrics as signals
 */
export async function storeMetricsAsSignal(
  result: CompanyMetricsResult,
  providerId: string,
): Promise<void> {
  const cui = normalizeCUI(result.cui);
  if (!cui) {
    return;
  }

  // Find company by CUI
  const company = await prisma.company.findUnique({
    where: { cui },
  });

  if (!company) {
    return;
  }

  // Store as ingest signal
  // Map provider to signal type (schema uses 'type', not 'signalType')
  const signalType = (providerId.includes("traffic") ? "WEB_TRAFFIC" : "TECH_STACK") as "WEB_TRAFFIC" | "TECH_STACK";
  
  await prisma.companyIngestSignal.create({
    data: {
      companyId: company.id,
      type: signalType,
      valueNumeric: result.metrics.websiteTraffic || null,
      valueText: null, // Metrics are numeric, not text
      observedAt: result.timestamp,
      // Note: schema doesn't have confidence, metadata, or source fields
      // These would need to be added to the schema if needed
    },
  });

  // Update company metrics if confidence is high enough
  // Only update if our current data is less confident or missing
  // Weighted by provider trust level
  const existingMetrics = await prisma.companyMetrics.findUnique({
    where: { companyId: company.id },
  });

  // Get provider trust level for weighted updates
  const { providerRegistry } = await import("./registry");
  const provider = providerRegistry.get(providerId);
  const providerTrust = provider?.getMetadata().trustLevel || 50;
  const weightedConfidence = calculateWeightedConfidence(providerTrust, result.confidence);

  if (weightedConfidence >= 50) {
    const updates: Prisma.CompanyMetricsUpdateInput = {};
    
    // Only update if new data is better (higher value) or missing
    // Weighted by provider trust and confidence
    if (result.metrics.websiteTraffic) {
      const shouldUpdate = !existingMetrics?.websiteTrafficMonthly || 
        (weightedConfidence >= 70 && result.metrics.websiteTraffic > (existingMetrics.websiteTrafficMonthly || 0));
      if (shouldUpdate) {
        updates.websiteTrafficMonthly = result.metrics.websiteTraffic;
      }
    }

    if (result.metrics.socialFollowers) {
      const shouldUpdate = !existingMetrics?.linkedinFollowers || 
        (weightedConfidence >= 70 && result.metrics.socialFollowers > (existingMetrics.linkedinFollowers || 0));
      if (shouldUpdate) {
        updates.linkedinFollowers = result.metrics.socialFollowers;
      }
    }

    if (result.metrics.mentions) {
      const shouldUpdate = !existingMetrics?.mentions30d || 
        (weightedConfidence >= 70 && result.metrics.mentions > (existingMetrics.mentions30d || 0));
      if (shouldUpdate) {
        updates.mentions30d = result.metrics.mentions;
      }
    }

    if (Object.keys(updates).length > 0) {
      if (existingMetrics) {
        await prisma.companyMetrics.update({
          where: { companyId: company.id },
          data: updates,
        });
      } else {
        // Convert update input to create input (exclude relation fields)
        const createData: Prisma.CompanyMetricsUncheckedCreateInput = {
          companyId: company.id,
          ...(updates.websiteTrafficMonthly !== undefined && { websiteTrafficMonthly: updates.websiteTrafficMonthly as number | null }),
          ...(updates.linkedinFollowers !== undefined && { linkedinFollowers: updates.linkedinFollowers as number | null }),
          ...(updates.mentions30d !== undefined && { mentions30d: updates.mentions30d as number | null }),
        };
        await prisma.companyMetrics.create({
          data: createData,
        });
      }
    }
  }
}

/**
 * Calculate weighted confidence based on provider trust
 */
export function calculateWeightedConfidence(
  providerTrustLevel: number,
  providerConfidence: number,
): number {
  // Weight: provider trust (0-100) * provider confidence (0-100) / 100
  return Math.round((providerTrustLevel * providerConfidence) / 100);
}

