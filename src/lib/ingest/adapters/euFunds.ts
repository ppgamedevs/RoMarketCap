/**
 * PROMPT 54: EU Funds Discovery Adapter
 * 
 * Discovers companies from EU Funds CSV/JSON exports.
 * Uses env vars EU_FUNDS_CSV_URL or EU_FUNDS_JSON_URL.
 */

import { DiscoverySource } from "@prisma/client";
import type { DiscoveryAdapter, DiscoveredRecord, DiscoveryEvidence } from "./types";
import { normalizeCui } from "@/src/lib/cui/normalize";
import { createHash } from "crypto";
import Papa from "papaparse";

/**
 * EU Funds row (flexible structure)
 */
type EUFundsRow = Record<string, string | number | null | undefined>;

/**
 * Candidate CUI column names
 */
const CUI_COLUMN_CANDIDATES = [
  "CUI",
  "Cod fiscal",
  "CodFiscal",
  "CIF",
  "CUI Beneficiar",
  "Beneficiary CUI",
  "Fiscal Code",
  "FiscalCode",
  "cui",
  "cui_beneficiar",
];

/**
 * Candidate beneficiary name column names
 */
const BENEFICIARY_NAME_CANDIDATES = [
  "Beneficiar",
  "Beneficiary",
  "Denumire Beneficiar",
  "Beneficiary Name",
  "Nume Beneficiar",
  "beneficiary_name",
];

/**
 * Hash a row for deduplication
 */
function hashRow(row: EUFundsRow): string {
  const normalized = JSON.stringify(row, Object.keys(row).sort());
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

/**
 * Extract CUI from a row
 */
function extractCui(row: EUFundsRow): string | null {
  for (const candidate of CUI_COLUMN_CANDIDATES) {
    const value = row[candidate];
    if (value) {
      const normalized = normalizeCui(String(value));
      if (normalized) {
        return normalized;
      }
    }
  }
  return null;
}

/**
 * Extract beneficiary name from a row
 */
function extractBeneficiaryName(row: EUFundsRow): string | undefined {
  for (const candidate of BENEFICIARY_NAME_CANDIDATES) {
    const value = row[candidate];
    if (value && typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

/**
 * Build evidence from EU Funds row
 */
function buildEvidence(row: EUFundsRow, rowHash: string): DiscoveryEvidence {
  const evidence: DiscoveryEvidence = {
    source: "EU_FUNDS",
    rowHash,
  };

  // Extract common fields
  if (row["Project ID"] || row["project_id"] || row["ID"]) {
    evidence.fundProjectId = String(row["Project ID"] || row["project_id"] || row["ID"]);
  }

  if (row["Program"] || row["program"] || row["Program Name"]) {
    evidence.programName = String(row["Program"] || row["program"] || row["Program Name"]);
  }

  if (row["Valoare"] || row["value"] || row["Amount"] || row["amount"] || row["Grant Amount"]) {
    const value = row["Valoare"] || row["value"] || row["Amount"] || row["amount"] || row["Grant Amount"];
    if (value) {
      const num = typeof value === "number" ? value : parseFloat(String(value));
      if (!isNaN(num)) {
        evidence.value = num;
        evidence.amount = num;
      }
    }
  }

  if (row["Data"] || row["date"] || row["Date"] || row["Award Date"]) {
    evidence.date = String(row["Data"] || row["date"] || row["Date"] || row["Award Date"]);
  }

  if (row["An"] || row["year"] || row["Year"]) {
    const year = row["An"] || row["year"] || row["Year"];
    if (year) {
      const num = typeof year === "number" ? year : parseInt(String(year), 10);
      if (!isNaN(num)) {
        evidence.year = num;
      }
    }
  }

  const beneficiaryName = extractBeneficiaryName(row);
  if (beneficiaryName) {
    evidence.companyName = beneficiaryName;
  }

  // Store full row as additional evidence
  Object.keys(row).forEach((key) => {
    if (!evidence[key as keyof DiscoveryEvidence]) {
      evidence[key] = row[key];
    }
  });

  return evidence;
}

export class EUFundsAdapter implements DiscoveryAdapter {
  name: DiscoverySource = "EU_FUNDS";

  async *discover(params: { cursor?: string; limit?: number }): AsyncGenerator<DiscoveredRecord> {
    const csvUrl = process.env.EU_FUNDS_CSV_URL;
    const jsonUrl = process.env.EU_FUNDS_JSON_URL;

    if (!csvUrl && !jsonUrl) {
      throw new Error("EU_FUNDS_CSV_URL or EU_FUNDS_JSON_URL environment variable must be set");
    }

    const limit = params.limit || 1000;
    const startLine = params.cursor ? parseInt(params.cursor, 10) : 0;
    let currentLine = 0;
    let yielded = 0;

    // Prefer CSV if both are set
    const url = csvUrl || jsonUrl!;
    const isJson = !!jsonUrl && !csvUrl;

    // Fetch data with security constraints (PROMPT 56)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "RoMarketCap/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch EU Funds data: ${response.status} ${response.statusText}`);
      }

      // Check content length (max 100MB)
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > 100 * 1024 * 1024) {
        throw new Error("Data file too large (max 100MB)");
      }

      clearTimeout(timeoutId);

      if (isJson) {
        // Parse JSON
        const data = await response.json();
        const items = Array.isArray(data) ? data : data.items || data.data || [];

        // Check actual size for JSON
        const jsonSize = Buffer.byteLength(JSON.stringify(data), "utf8");
        if (jsonSize > 100 * 1024 * 1024) {
          throw new Error("JSON content too large (max 100MB)");
        }

        for (const item of items) {
          if (yielded >= limit) {
            break;
          }

          const row = item as EUFundsRow;
          const rowHash = hashRow(row);
          const cui = extractCui(row);

          if (!cui) {
            continue; // Skip rows without valid CUI
          }

          const evidence = buildEvidence(row, rowHash);
          const beneficiaryName = extractBeneficiaryName(row);

          yield {
            cui,
            companyName: beneficiaryName,
            evidence,
            discoveredAt: new Date(),
          };

          yielded++;
        }
      } else {
        // Parse CSV
        const text = await response.text();

        // Check actual size
        if (Buffer.byteLength(text, "utf8") > 100 * 1024 * 1024) {
          throw new Error("CSV content too large (max 100MB)");
        }

        const records: DiscoveredRecord[] = [];

        await new Promise<void>((resolve, reject) => {
          Papa.parse<EUFundsRow>(text, {
            header: true,
            skipEmptyLines: true,
            step: (result: any, parser: any) => {
              currentLine++;

              // Skip until we reach the cursor position
              if (currentLine <= startLine) {
                return;
              }

              // Stop if we've reached the limit
              if (yielded >= limit) {
                parser.abort();
                return;
              }

              const row = result.data;
              const rowHash = hashRow(row);
              const cui = extractCui(row);

              if (!cui) {
                return; // Skip rows without valid CUI
              }

              const evidence = buildEvidence(row, rowHash);
              const beneficiaryName = extractBeneficiaryName(row);

              records.push({
                cui,
                companyName: beneficiaryName,
                evidence,
                discoveredAt: new Date(),
              });

              yielded++;
            },
            complete: () => {
              resolve();
            },
            error: (error) => {
              reject(error);
            },
          } as any);
        });

        // Yield all records
        for (const record of records) {
          yield record;
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout (30s)");
      }
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    const csvUrl = process.env.EU_FUNDS_CSV_URL;
    const jsonUrl = process.env.EU_FUNDS_JSON_URL;

    if (!csvUrl && !jsonUrl) {
      return false;
    }

    try {
      const url = csvUrl || jsonUrl!;
      const response = await fetch(url, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }
}
