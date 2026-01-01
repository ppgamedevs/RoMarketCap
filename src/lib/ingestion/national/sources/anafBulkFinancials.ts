/**
 * PROMPT 63: ANAF Bulk Financial Data Adapter
 * 
 * Downloads and parses bulk financial statements from data.gov.ro / ANAF.
 * This provides revenue, profit, and employee data for thousands of companies.
 * 
 * Data source: ANAF publishes annual "Situații financiare" datasets on data.gov.ro
 * Format: CSV/XLSX with columns like CUI, Cifra de afaceri, Profit, Angajați
 * 
 * Source priority: 90 (very high - official ANAF financial data)
 */

import { kv } from "@vercel/kv";
import * as XLSX from "xlsx";
import type { IngestionSource } from "../../sources";
import type { SourceId, SourceCompanyRecord } from "../../types";
import { normalizeCUI } from "../../cuiValidation";

// Default ANAF bulk financials URL (data.gov.ro)
// This should be updated periodically as new datasets are published
const DEFAULT_ANAF_BULK_URL = process.env.ANAF_BULK_FINANCIALS_URL || "";

// Cache keys
const CURSOR_KEY = "ingest:cursor:ANAF_BULK";
const LAST_DOWNLOAD_KEY = "anaf_bulk:last_download";
const RATE_LIMIT_KEY = "anaf_bulk:rate_limit";

// Rate limiting: 1 download per hour for bulk files
const RATE_LIMIT_MS = 3600000; // 1 hour

/**
 * Financial data extracted from ANAF bulk files
 */
export type ANAFBulkFinancialData = {
  cui: string;
  name?: string;
  fiscalYear: number;
  revenue?: number;
  profit?: number;
  assets?: number;
  equity?: number;
  employees?: number;
  caen?: string;
  county?: string;
};

/**
 * Column header normalization for ANAF bulk files
 */
const COLUMN_MAPPINGS: Record<string, string[]> = {
  cui: ["cui", "cif", "cod fiscal", "cod unic", "cod_unic", "cod unic de inregistrare"],
  name: ["denumire", "denumire firma", "denumire_firma", "nume", "companie", "firma", "denumire operator", "denumire societate"],
  revenue: ["cifra de afaceri", "cifra_de_afaceri", "venituri totale", "venituri", "ca", "turnover", "cifra afaceri neta", "cifra_afaceri_neta"],
  profit: ["profit", "profit net", "profit_net", "rezultat net", "rezultat_net", "rezultat brut", "profit brut"],
  assets: ["active totale", "active_totale", "total active", "total_active", "active"],
  equity: ["capitaluri proprii", "capital propriu", "capital_propriu", "capitaluri_proprii", "equity"],
  employees: ["numar angajati", "numar_angajati", "angajati", "nr angajati", "nr_angajati", "nr. salariati", "numar salariati", "numar_salariati"],
  caen: ["caen", "cod caen", "cod_caen", "activitate principala"],
  county: ["judet", "judet sediu", "judet_sediu", "localitate"],
  fiscalYear: ["an", "an fiscal", "an_fiscal", "year", "exercitiu", "exercitiu financiar"],
};

/**
 * Normalize column header for matching
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s_]/g, "")
    .trim();
}

/**
 * Find column index by header
 */
function findColumnIndex(headers: string[], field: string): number {
  const mappings = COLUMN_MAPPINGS[field] || [field];
  
  for (let i = 0; i < headers.length; i++) {
    const normalizedHeader = normalizeHeader(headers[i]);
    for (const mapping of mappings) {
      if (normalizedHeader === normalizeHeader(mapping)) {
        return i;
      }
      // Also check if header contains the mapping
      if (normalizedHeader.includes(normalizeHeader(mapping))) {
        return i;
      }
    }
  }
  
  return -1;
}

/**
 * Parse number from various formats
 */
function parseNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }
  
  if (typeof value === "number") {
    return isFinite(value) ? value : undefined;
  }
  
  const str = String(value)
    .replace(/[,\s]/g, "") // Remove commas and spaces
    .replace(/\./g, ""); // Remove dots (European format)
  
  const num = parseFloat(str);
  return isFinite(num) ? num : undefined;
}

/**
 * Check rate limit for downloads
 */
async function checkRateLimit(): Promise<boolean> {
  try {
    const lastDownload = await kv.get<number>(LAST_DOWNLOAD_KEY);
    if (lastDownload) {
      const elapsed = Date.now() - lastDownload;
      if (elapsed < RATE_LIMIT_MS) {
        console.log(`[anaf-bulk] Rate limited: ${Math.round((RATE_LIMIT_MS - elapsed) / 60000)} minutes until next download allowed`);
        return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * Update download timestamp
 */
async function updateLastDownload(): Promise<void> {
  try {
    await kv.set(LAST_DOWNLOAD_KEY, Date.now());
  } catch (error) {
    console.warn("[anaf-bulk] Failed to update last download timestamp:", error);
  }
}

/**
 * Parse XLSX file and extract financial data
 */
function parseXLSXFinancials(buffer: Buffer, fiscalYear: number): ANAFBulkFinancialData[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  
  // Convert to JSON with header: 1 returns array of arrays
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  
  if (rawData.length < 2) {
    console.warn("[anaf-bulk] XLSX file has insufficient rows");
    return [];
  }
  
  // Get headers from first row
  const firstRow = rawData[0];
  if (!Array.isArray(firstRow)) {
    console.error("[anaf-bulk] First row is not an array");
    return [];
  }
  const headers = firstRow.map((h) => String(h || ""));
  
  // Find column indices
  const cuiIdx = findColumnIndex(headers, "cui");
  const nameIdx = findColumnIndex(headers, "name");
  const revenueIdx = findColumnIndex(headers, "revenue");
  const profitIdx = findColumnIndex(headers, "profit");
  const assetsIdx = findColumnIndex(headers, "assets");
  const equityIdx = findColumnIndex(headers, "equity");
  const employeesIdx = findColumnIndex(headers, "employees");
  const caenIdx = findColumnIndex(headers, "caen");
  const countyIdx = findColumnIndex(headers, "county");
  const yearIdx = findColumnIndex(headers, "fiscalYear");
  
  if (cuiIdx === -1) {
    console.error("[anaf-bulk] CUI column not found in XLSX");
    return [];
  }
  
  console.log("[anaf-bulk] Column mapping:", {
    cui: cuiIdx,
    name: nameIdx,
    revenue: revenueIdx,
    profit: profitIdx,
    employees: employeesIdx,
    caen: caenIdx,
    county: countyIdx,
  });
  
  const results: ANAFBulkFinancialData[] = [];
  
  // Process data rows
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!Array.isArray(row)) continue;
    
    const cuiRaw = String(row[cuiIdx] || "").trim();
    const normalizedCui = normalizeCUI(cuiRaw);
    
    if (!normalizedCui) {
      continue;
    }
    
    const record: ANAFBulkFinancialData = {
      cui: normalizedCui,
      fiscalYear: yearIdx >= 0 ? (parseNumber(row[yearIdx]) || fiscalYear) : fiscalYear,
      name: nameIdx >= 0 ? String(row[nameIdx] || "").trim() || undefined : undefined,
      revenue: revenueIdx >= 0 ? parseNumber(row[revenueIdx]) : undefined,
      profit: profitIdx >= 0 ? parseNumber(row[profitIdx]) : undefined,
      assets: assetsIdx >= 0 ? parseNumber(row[assetsIdx]) : undefined,
      equity: equityIdx >= 0 ? parseNumber(row[equityIdx]) : undefined,
      employees: employeesIdx >= 0 ? parseNumber(row[employeesIdx]) : undefined,
      caen: caenIdx >= 0 ? String(row[caenIdx] || "").trim() || undefined : undefined,
      county: countyIdx >= 0 ? String(row[countyIdx] || "").trim() || undefined : undefined,
    };
    
    // Only include records with at least some financial data
    if (record.revenue !== undefined || record.profit !== undefined || record.employees !== undefined) {
      results.push(record);
    }
  }
  
  console.log(`[anaf-bulk] Parsed ${results.length} financial records from XLSX`);
  
  return results;
}

/**
 * ANAF Bulk Financials Source
 * 
 * Note: This source requires manual setup of ANAF_BULK_FINANCIALS_URL
 * pointing to a data.gov.ro dataset with company financials.
 */
export class ANAFBulkFinancialsSource implements IngestionSource {
  sourceId: SourceId = "ANAF_BULK";

  async fetchBatch(
    cursor?: string,
    limit = 500,
    options?: { forceReprocess?: boolean }
  ): Promise<{
    records: SourceCompanyRecord[];
    nextCursor?: string;
  }> {
    const url = DEFAULT_ANAF_BULK_URL;
    
    if (!url) {
      console.log("[anaf-bulk] No ANAF_BULK_FINANCIALS_URL configured, skipping");
      return { records: [] };
    }

    // Check rate limit (unless force reprocess)
    if (!options?.forceReprocess) {
      const canProceed = await checkRateLimit();
      if (!canProceed) {
        return { records: [] };
      }
    }

    try {
      // Check cursor - if we've already processed this URL, skip
      const processedUrl = await kv.get<string>(CURSOR_KEY);
      if (processedUrl === url && !options?.forceReprocess) {
        console.log("[anaf-bulk] Already processed this URL, skipping");
        return { records: [] };
      }

      console.log(`[anaf-bulk] Downloading ANAF bulk file from: ${url}`);

      // Download the file
      const response = await fetch(url, {
        headers: {
          "User-Agent": "RoMarketCap/1.0 (https://www.romarketcap.com)",
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      
      // Update last download timestamp
      await updateLastDownload();

      // Determine fiscal year from URL or default to current year - 1
      const currentYear = new Date().getFullYear();
      const fiscalYear = currentYear - 1;

      // Parse the file
      const financials = parseXLSXFinancials(buffer, fiscalYear);

      // Convert to SourceCompanyRecord format
      const records: SourceCompanyRecord[] = [];
      const startIdx = cursor ? parseInt(cursor, 10) : 0;
      const endIdx = Math.min(startIdx + limit, financials.length);

      for (let i = startIdx; i < endIdx; i++) {
        const fin = financials[i];
        
        records.push({
          sourceId: "ANAF_BULK",
          sourceRef: `anaf_bulk:${fin.fiscalYear}:${fin.cui}`,
          cui: fin.cui,
          name: fin.name || null,
          countySlug: fin.county ? fin.county.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-") : undefined,
          industrySlug: undefined, // Would need CAEN to industry mapping
          domain: undefined,
          address: undefined,
          contacts: undefined,
          metrics: {
            revenue: fin.revenue,
            profit: fin.profit,
            employees: fin.employees,
            currency: "RON",
            year: fin.fiscalYear,
          },
          lastSeenAt: new Date(),
          confidence: 90, // High confidence for official ANAF data
          raw: {
            fiscalYear: fin.fiscalYear,
            revenue: fin.revenue,
            profit: fin.profit,
            assets: fin.assets,
            equity: fin.equity,
            employees: fin.employees,
            caen: fin.caen,
          },
        });
      }

      // Determine next cursor
      let nextCursor: string | undefined;
      if (endIdx < financials.length) {
        nextCursor = String(endIdx);
      } else {
        // Mark URL as processed
        await kv.set(CURSOR_KEY, url);
      }

      console.log(`[anaf-bulk] Returning ${records.length} records (${startIdx}-${endIdx} of ${financials.length})`);

      return {
        records,
        nextCursor,
      };
    } catch (error) {
      console.error("[anaf-bulk] Error fetching ANAF bulk data:", error);
      return { records: [] };
    }
  }

  async healthCheck(): Promise<boolean> {
    return !!DEFAULT_ANAF_BULK_URL;
  }
}

/**
 * Process ANAF bulk financial data and create CompanyFinancialSnapshot records
 */
export async function processANAFBulkFinancials(
  financials: ANAFBulkFinancialData[],
  options?: { dryRun?: boolean }
): Promise<{
  processed: number;
  created: number;
  updated: number;
  errors: number;
}> {
  const { prisma } = await import("@/src/lib/db");
  
  const results = {
    processed: 0,
    created: 0,
    updated: 0,
    errors: 0,
  };

  for (const fin of financials) {
    try {
      results.processed++;

      if (options?.dryRun) {
        continue;
      }

      // Find company by CUI
      const company = await prisma.company.findUnique({
        where: { cui: fin.cui },
        select: { id: true },
      });

      if (!company) {
        // Company doesn't exist - skip (we only update existing companies)
        continue;
      }

      // Check if we already have a snapshot for this year
      const existingSnapshot = await prisma.companyFinancialSnapshot.findFirst({
        where: {
          companyId: company.id,
          fiscalYear: fin.fiscalYear,
        },
      });

      if (existingSnapshot) {
        // Update existing snapshot if we have better data
        if (fin.revenue !== undefined || fin.profit !== undefined) {
          await prisma.companyFinancialSnapshot.update({
            where: { id: existingSnapshot.id },
            data: {
              revenue: fin.revenue ? fin.revenue : existingSnapshot.revenue,
              profit: fin.profit ? fin.profit : existingSnapshot.profit,
              employees: fin.employees ?? existingSnapshot.employees,
              dataSource: "ANAF_WS",
              fetchedAt: new Date(),
            },
          });
          results.updated++;
        }
      } else {
        // Create new snapshot
        await prisma.companyFinancialSnapshot.create({
          data: {
            companyId: company.id,
            fiscalYear: fin.fiscalYear,
            revenue: fin.revenue,
            profit: fin.profit,
            employees: fin.employees,
            currency: "RON",
            dataSource: "ANAF_WS",
            fetchedAt: new Date(),
          },
        });
        results.created++;
      }

      // Update company's denormalized financials if this is the latest year
      const latestSnapshot = await prisma.companyFinancialSnapshot.findFirst({
        where: { companyId: company.id },
        orderBy: { fiscalYear: "desc" },
      });

      if (latestSnapshot && latestSnapshot.fiscalYear === fin.fiscalYear) {
        await prisma.company.update({
          where: { id: company.id },
          data: {
            revenueLatest: fin.revenue,
            profitLatest: fin.profit,
            employees: fin.employees,
            lastFinancialSyncAt: new Date(),
          },
        });
      }

    } catch (error) {
      results.errors++;
      console.error(`[anaf-bulk] Error processing CUI ${fin.cui}:`, error);
    }
  }

  return results;
}
