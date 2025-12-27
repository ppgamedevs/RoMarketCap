/**
 * PROMPT 58: ANAF Financial Sync (Safe Mode)
 * 
 * Main entry point for syncing company financials from ANAF web service.
 * Handles fetching, parsing, idempotency, and database updates.
 */

import { prisma } from "@/src/lib/db";
import { Prisma, CompanyFinancialDataSource } from "@prisma/client";
import { normalizeCUI } from "@/src/lib/ingestion/cuiValidation";
import { fetchFinancialsFromANAF } from "./wsClient";
import { parseANAFResponse } from "./parse";
import type { SyncFinancialsOptions, FinancialSyncResult, ANAFFinancialData } from "./types";
import { logCompanyChange } from "@/src/lib/changelog/logChange";
import { CompanyChangeType } from "@prisma/client";
import { createHash } from "crypto";
import { addFinancialDeadLetter } from "./financialDeadletter";
import * as Sentry from "@sentry/nextjs";

/**
 * Compute stable checksum for idempotency
 */
function computeChecksum(data: ANAFFinancialData[]): string {
  // Normalize data: sort by year, remove rawResponse for checksum
  const normalized = data
    .map((d) => ({
      year: d.year,
      revenue: d.revenue,
      profit: d.profit,
      employees: d.employees,
      currency: d.currency,
    }))
    .sort((a, b) => a.year - b.year);

  const json = JSON.stringify(normalized);
  return createHash("sha256").update(json).digest("hex").slice(0, 32);
}

/**
 * Sync financials for a single company by CUI
 */
export async function syncCompanyFinancialsByCui(
  options: SyncFinancialsOptions
): Promise<FinancialSyncResult> {
  const { cui, dryRun = false, years, preferLatest = false } = options;
  const startTime = Date.now();

  // Normalize CUI
  const normalizedCui = normalizeCUI(cui);
  if (!normalizedCui) {
    return {
      success: false,
      data: [],
      warnings: [],
      error: `Invalid CUI: ${cui}`,
    };
  }

  // Get company
  const company = await prisma.company.findUnique({
    where: { cui: normalizedCui },
    select: {
      id: true,
      cui: true,
      name: true,
      revenueLatest: true,
      profitLatest: true,
      employees: true,
      currency: true,
      lastFinancialSyncAt: true,
      financialSource: true,
    },
  });

  if (!company) {
    return {
      success: false,
      data: [],
      warnings: [],
      error: `Company not found for CUI: ${normalizedCui}`,
    };
  }

  try {
    // Fetch from ANAF
    const rawResponse = await fetchFinancialsFromANAF(normalizedCui);

    // Parse response
    let parsedData: ANAFFinancialData[];
    try {
      parsedData = parseANAFResponse(rawResponse);
    } catch (parseError) {
      const errorMsg = parseError instanceof Error ? parseError.message : "Parse error";
      return {
        success: false,
        data: [],
        warnings: [],
        error: `Failed to parse ANAF response: ${errorMsg}`,
      };
    }

    // Filter by years if specified
    if (years && years.length > 0) {
      parsedData = parsedData.filter((d) => years.includes(d.year));
    }

    // Prefer latest year if requested
    if (preferLatest && parsedData.length > 0) {
      const latest = parsedData.reduce((a, b) => (a.year > b.year ? a : b));
      parsedData = [latest];
    }

    if (parsedData.length === 0) {
      return {
        success: false,
        data: [],
        warnings: ["No financial data found for specified criteria"],
        error: "No matching financial data",
      };
    }

    // Compute checksum
    const checksum = computeChecksum(parsedData);

    // Check if data already exists (idempotency check)
    const existingSnapshots = await prisma.companyFinancialSnapshot.findMany({
      where: {
        companyId: company.id,
        dataSource: CompanyFinancialDataSource.ANAF_WS,
        fiscalYear: { in: parsedData.map((d) => d.year) },
      },
      select: { fiscalYear: true, checksum: true },
    });

    const existingChecksums = new Set(
      existingSnapshots.map((s) => s.checksum).filter((c): c is string => c !== null)
    );

    // If checksum matches, no changes needed
    if (existingChecksums.has(checksum)) {
      return {
        success: true,
        data: parsedData,
        warnings: ["Data already synced (checksum match)"],
        checksum,
      };
    }

    // Prepare updates
    const updates: Array<{
      year: number;
      revenue: number | null;
      profit: number | null;
      employees: number | null;
      currency: string;
      confidence: number;
    }> = [];

    for (const data of parsedData) {
      const existing = existingSnapshots.find((s) => s.fiscalYear === data.year);
      if (!existing || existing.checksum !== checksum) {
        updates.push({
          year: data.year,
          revenue: data.revenue,
          profit: data.profit,
          employees: data.employees,
          currency: data.currency,
          confidence: data.confidence,
        });
      }
    }

    if (dryRun) {
      // Return what would be updated
      return {
        success: true,
        data: parsedData,
        warnings: updates.length === 0 ? ["No changes needed"] : [],
        checksum,
      };
    }

    // Live mode: update database
    const latestYear = parsedData.reduce((a, b) => (a.year > b.year ? a : b));

    // Upsert financial snapshots
    for (const update of updates) {
      await prisma.companyFinancialSnapshot.upsert({
        where: {
          companyId_fiscalYear_dataSource: {
            companyId: company.id,
            fiscalYear: update.year,
            dataSource: CompanyFinancialDataSource.ANAF_WS,
          },
        },
        create: {
          companyId: company.id,
          fiscalYear: update.year,
          revenue: update.revenue !== null ? update.revenue : null,
          profit: update.profit !== null ? update.profit : null,
          employees: update.employees !== null ? update.employees : null,
          currency: update.currency,
          dataSource: CompanyFinancialDataSource.ANAF_WS,
          confidenceScore: update.confidence,
          checksum,
          fetchedAt: new Date(),
        },
        update: {
          revenue: update.revenue !== null ? update.revenue : null,
          profit: update.profit !== null ? update.profit : null,
          employees: update.employees !== null ? update.employees : null,
          currency: update.currency,
          confidenceScore: update.confidence,
          checksum,
          fetchedAt: new Date(),
        },
      });
    }

    // Update Company denormalized fields with latest year
    const before = {
      revenueLatest: company.revenueLatest ? Number(company.revenueLatest) : null,
      profitLatest: company.profitLatest ? Number(company.profitLatest) : null,
      employees: company.employees,
    };

    await prisma.company.update({
      where: { id: company.id },
      data: {
        revenueLatest: latestYear.revenue !== null ? latestYear.revenue : undefined,
        profitLatest: latestYear.profit !== null ? latestYear.profit : undefined,
        employees: latestYear.employees !== null ? latestYear.employees : undefined,
        currency: latestYear.currency,
        lastFinancialSyncAt: new Date(),
        financialSyncVersion: 1,
        financialSource: {
          year: latestYear.year,
          source: "ANAF_WS",
          fetchedAt: new Date().toISOString(),
          confidence: latestYear.confidence,
        } as Prisma.InputJsonValue,
      },
    });

    const after = {
      revenueLatest: latestYear.revenue,
      profitLatest: latestYear.profit,
      employees: latestYear.employees,
    };

    // Log change
    await logCompanyChange({
      companyId: company.id,
      changeType: CompanyChangeType.FINANCIAL_SYNC,
      metadata: {
        before,
        after,
        years: parsedData.map((d) => d.year),
        checksum,
        source: "ANAF_WS",
      },
    }).catch(() => null); // Don't fail sync if logging fails

    // Structured logging
    const durationMs = Date.now() - startTime;
    const snapshotCreated = updates.length > 0;
    console.log("[anaf-sync]", {
      cui: normalizedCui,
      yearsCount: parsedData.length,
      dryRun,
      status: "success",
      durationMs,
      snapshotCreated,
      checksum,
    });

    return {
      success: true,
      data: parsedData,
      warnings: [],
      checksum,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const durationMs = Date.now() - startTime;

    // Structured logging for error
    console.error("[anaf-sync]", {
      cui: normalizedCui,
      yearsCount: years?.length || 0,
      dryRun,
      status: "error",
      durationMs,
      snapshotCreated: false,
      error: errorMessage,
    });

    // Capture exception with Sentry tags
    if (error instanceof Error) {
      Sentry.captureException(error, {
        tags: {
          module: "anaf_sync",
          cui: normalizedCui,
        },
        extra: {
          dryRun,
          years,
          preferLatest,
        },
      });
    }

    // Add to dead-letter queue
    await addFinancialDeadLetter(normalizedCui, errorMessage, 1).catch(() => null);

    return {
      success: false,
      data: [],
      warnings: [],
      error: errorMessage,
    };
  }
}

