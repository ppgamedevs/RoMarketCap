/**
 * PROMPT 54: SEAP (Sistemul Electronic de Achiziții Publice) Discovery Adapter
 * 
 * Discovers companies from SEAP CSV exports.
 * Uses env var SEAP_CSV_URL for the CSV file URL.
 */

import { DiscoverySource } from "@prisma/client";
import type { DiscoveryAdapter, DiscoveredRecord, DiscoveryEvidence } from "./types";
import { normalizeCui } from "@/src/lib/cui/normalize";
import { createHash } from "crypto";
import Papa from "papaparse";

/**
 * SEAP CSV row (flexible structure)
 */
type SEAPRow = Record<string, string | number | null | undefined>;

/**
 * Candidate CUI column names to try
 */
const CUI_COLUMN_CANDIDATES = [
  "CUI",
  "CUI Furnizor",
  "Cod fiscal",
  "CodFiscal",
  "CIF",
  "CIF/CUI",
  "CUI_Furnizor",
  "CUI_FURNIZOR",
  "cui_furnizor",
  "cui",
  "Fiscal Code",
  "FiscalCode",
  "Supplier CUI",
  "Supplier_CUI",
];

/**
 * Candidate supplier name column names
 */
const SUPPLIER_NAME_CANDIDATES = [
  "Furnizor",
  "Denumire Furnizor",
  "Supplier",
  "Supplier Name",
  "Nume Furnizor",
  "Denumire_Furnizor",
  "supplier_name",
];

/**
 * Hash a row for deduplication
 */
function hashRow(row: SEAPRow): string {
  const normalized = JSON.stringify(row, Object.keys(row).sort());
  return createHash("sha256").update(normalized).digest("hex").slice(0, 32);
}

/**
 * Extract CUI from a row by trying candidate column names
 */
function extractCui(row: SEAPRow): string | null {
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
 * Extract supplier name from a row
 */
function extractSupplierName(row: SEAPRow): string | undefined {
  for (const candidate of SUPPLIER_NAME_CANDIDATES) {
    const value = row[candidate];
    if (value && typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

/**
 * Build evidence from SEAP row
 */
function buildEvidence(row: SEAPRow, rowHash: string): DiscoveryEvidence {
  const evidence: DiscoveryEvidence = {
    source: "SEAP",
    rowHash,
  };

  // Extract common fields
  if (row["Contract ID"] || row["contract_id"] || row["ID"]) {
    evidence.contractId = String(row["Contract ID"] || row["contract_id"] || row["ID"]);
  }

  if (row["Autoritate"] || row["authority"] || row["Contracting Authority"]) {
    evidence.authorityName = String(row["Autoritate"] || row["authority"] || row["Contracting Authority"]);
  }

  if (row["Valoare"] || row["value"] || row["Amount"] || row["amount"]) {
    const value = row["Valoare"] || row["value"] || row["Amount"] || row["amount"];
    if (value) {
      const num = typeof value === "number" ? value : parseFloat(String(value));
      if (!isNaN(num)) {
        evidence.value = num;
        evidence.amount = num;
      }
    }
  }

  if (row["Data"] || row["date"] || row["Date"]) {
    evidence.date = String(row["Data"] || row["date"] || row["Date"]);
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

  const supplierName = extractSupplierName(row);
  if (supplierName) {
    evidence.supplierName = supplierName;
    evidence.companyName = supplierName;
  }

  // Store full row as additional evidence
  Object.keys(row).forEach((key) => {
    if (!evidence[key as keyof DiscoveryEvidence]) {
      evidence[key] = row[key];
    }
  });

  return evidence;
}

export class SEAPAdapter implements DiscoveryAdapter {
  name: DiscoverySource = "SEAP";

  async *discover(params: { cursor?: string; limit?: number }): AsyncGenerator<DiscoveredRecord> {
    const csvUrl = process.env.SEAP_CSV_URL;
    if (!csvUrl) {
      throw new Error("SEAP_CSV_URL environment variable not set");
    }

    const limit = params.limit || 1000;
    const startLine = params.cursor ? parseInt(params.cursor, 10) : 0;
    let currentLine = 0;
    let yielded = 0;

    // Fetch CSV with security constraints (PROMPT 56)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(csvUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "RoMarketCap/1.0",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch SEAP CSV: ${response.status} ${response.statusText}`);
      }

      // Check content length (max 100MB)
      const contentLength = response.headers.get("content-length");
      if (contentLength && parseInt(contentLength, 10) > 100 * 1024 * 1024) {
        throw new Error("CSV file too large (max 100MB)");
      }

      const text = await response.text();

      // Check actual size
      if (Buffer.byteLength(text, "utf8") > 100 * 1024 * 1024) {
        throw new Error("CSV content too large (max 100MB)");
      }

      clearTimeout(timeoutId);

    // Parse CSV and collect records
    const records: DiscoveredRecord[] = [];

    await new Promise<void>((resolve, reject) => {
      Papa.parse<SEAPRow>(text, {
        header: true,
        skipEmptyLines: true,
        step: (result, parser) => {
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
          const supplierName = extractSupplierName(row);

          records.push({
            cui,
            companyName: supplierName,
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
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("Request timeout (30s)");
      }
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    const csvUrl = process.env.SEAP_CSV_URL;
    if (!csvUrl) {
      return false;
    }

    try {
      const response = await fetch(csvUrl, { method: "HEAD" });
      return response.ok;
    } catch {
      return false;
    }
  }
}
