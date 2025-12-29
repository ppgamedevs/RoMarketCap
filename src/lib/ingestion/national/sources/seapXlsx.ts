/**
 * PROMPT 61: SEAP XLSX Source
 * 
 * Downloads and parses XLSX files from data.gov.ro for SEAP purchases.
 * Extracts supplier CUIs from the first worksheet.
 */

import type { SourceId, SourceCompanyRecord } from "../../types";
import type { IngestionSource } from "../../sources";
import { normalizeCUI } from "../../cuiValidation";
import { withRetry, isRetryableError } from "@/src/lib/retry/withRetry";
import * as XLSX from "xlsx";

/**
 * Maximum file size (50MB) - reduced to prevent memory issues
 */
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * Request timeout (60 seconds for large files)
 */
const REQUEST_TIMEOUT_MS = 60000;

/**
 * Candidate CUI column header names (case-insensitive matching)
 */
const CUI_HEADER_CANDIDATES = [
  "CUI",
  "CIF",
  "Cod fiscal",
  "Cod_Fiscal",
  "CodFiscal",
  "CUI Furnizor",
  "CUI_FURNIZOR",
  "CUI_Furnizor",
  "CUI Furn.",
  "CUI_Furn",
  "CUI_Furn.",
  "CUI Furnizor",
  "CUI_FURNIZOR",
  "Supplier CUI",
  "Supplier_CUI",
  "Fiscal Code",
  "FiscalCode",
  "Fiscal_Code",
];

/**
 * Candidate supplier name column header names
 */
const SUPPLIER_NAME_CANDIDATES = [
  "Furnizor",
  "Denumire Furnizor",
  "Denumire_Furnizor",
  "Supplier",
  "Supplier Name",
  "Supplier_Name",
  "Nume Furnizor",
  "Nume_Furnizor",
  "supplier_name",
];

/**
 * Find column index by header name (case-insensitive, flexible matching)
 */
function findColumnIndex(
  headers: string[],
  candidates: string[]
): number | null {
  const normalizedHeaders = headers.map((h) => h.trim().toLowerCase());
  
  for (const candidate of candidates) {
    const normalizedCandidate = candidate.trim().toLowerCase();
    
    // Exact match
    const exactIndex = normalizedHeaders.indexOf(normalizedCandidate);
    if (exactIndex !== -1) {
      return exactIndex;
    }
    
    // Partial match (contains)
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (normalizedHeaders[i]?.includes(normalizedCandidate) || 
          normalizedCandidate.includes(normalizedHeaders[i] || "")) {
        return i;
      }
    }
  }
  
  return null;
}

/**
 * Detect header row (first non-empty row with text values)
 */
function detectHeaderRow(worksheet: XLSX.WorkSheet): number {
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  
  for (let row = 0; row <= range.e.r && row < 100; row++) {
    let hasText = false;
    let emptyCount = 0;
    
    for (let col = 0; col <= range.e.c && col < 50; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      
      if (cell) {
        const value = cell.v;
        if (typeof value === "string" && value.trim().length > 0) {
          hasText = true;
        } else {
          emptyCount++;
        }
      } else {
        emptyCount++;
      }
    }
    
    // If row has text and not all empty, likely header row
    if (hasText && emptyCount < range.e.c) {
      return row;
    }
  }
  
  return 0; // Default to first row
}

/**
 * Extract headers from worksheet
 */
function extractHeaders(worksheet: XLSX.WorkSheet, headerRow: number): string[] {
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  const headers: string[] = [];
  
  for (let col = 0; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow, c: col });
    const cell = worksheet[cellAddress];
    const value = cell?.v;
    headers.push(typeof value === "string" ? value : `Column${col + 1}`);
  }
  
  return headers;
}

/**
 * Fetch XLSX file with retry and timeout
 */
async function fetchXlsx(url: string): Promise<Buffer> {
  return withRetry(
    async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      
      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "RoMarketCap/1.0",
          },
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch XLSX: ${response.status} ${response.statusText}`);
        }
        
        // Check content length
        const contentLength = response.headers.get("content-length");
        if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
          throw new Error(`File too large: ${contentLength} bytes (max ${MAX_FILE_SIZE})`);
        }
        
        // Read response as array buffer
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Check actual size
        if (buffer.length > MAX_FILE_SIZE) {
          throw new Error(`File too large: ${buffer.length} bytes (max ${MAX_FILE_SIZE})`);
        }
        
        return buffer;
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error(`Request timeout (${REQUEST_TIMEOUT_MS}ms)`);
        }
        throw error;
      }
    },
    {
      maxRetries: 3,
      initialDelay: 1000,
      retryable: isRetryableError,
    }
  );
}

/**
 * Parse XLSX and extract CUIs (memory-optimized)
 * Only extracts CUI and supplier name columns to minimize memory usage
 */
function parseXlsxAndExtractCuis(buffer: Buffer, limit: number): {
  cuis: Set<string>;
  supplierNames: Map<string, string>;
  rawDataMap: Map<string, Record<string, unknown>>;
} {
  // Use memory-efficient options: only read what we need
  // Note: XLSX library doesn't support streaming, but we can optimize by:
  // 1. Not using dense mode (saves memory)
  // 2. Only extracting columns we need
  // 3. Limiting rows processed
  const workbook = XLSX.read(buffer, { 
    type: "buffer", 
    cellDates: false,
    dense: false, // Don't use dense mode (saves memory)
  });
  
  // Get first worksheet
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("XLSX file has no worksheets");
  }
  
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Detect header row
  const headerRow = detectHeaderRow(worksheet);
  const headers = extractHeaders(worksheet, headerRow);
  
  // Find CUI and supplier name columns
  const cuiColumnIndex = findColumnIndex(headers, CUI_HEADER_CANDIDATES);
  const supplierNameColumnIndex = findColumnIndex(headers, SUPPLIER_NAME_CANDIDATES);
  
  if (cuiColumnIndex === null) {
    throw new Error(
      `Could not find CUI column. Available headers: ${headers.slice(0, 10).join(", ")}`
    );
  }
  
  // Extract data rows - only store minimal data to save memory
  const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
  const cuis = new Set<string>();
  const supplierNames = new Map<string, string>();
  // Only store minimal raw data (CUI and name) instead of entire row
  const rawDataMap = new Map<string, Record<string, unknown>>();
  
  // Limit the range to process to save memory
  const maxRow = Math.min(range.e.r, headerRow + limit + 100);
  
  for (let row = headerRow + 1; row <= maxRow && cuis.size < limit; row++) {
    const cuiCellAddress = XLSX.utils.encode_cell({ r: row, c: cuiColumnIndex });
    const cuiCell = worksheet[cuiCellAddress];
    
    if (!cuiCell || !cuiCell.v) {
      continue; // Skip empty rows
    }
    
    const cuiValue = String(cuiCell.v).trim();
    if (!cuiValue) {
      continue;
    }
    
    // Normalize CUI
    const normalizedCui = normalizeCUI(cuiValue);
    if (!normalizedCui) {
      continue; // Skip invalid CUIs
    }
    
    // Skip if we already have this CUI (deduplication)
    if (cuis.has(normalizedCui)) {
      continue;
    }
    
    // Extract supplier name if available
    let supplierName: string | null = null;
    if (supplierNameColumnIndex !== null) {
      const nameCellAddress = XLSX.utils.encode_cell({ r: row, c: supplierNameColumnIndex });
      const nameCell = worksheet[nameCellAddress];
      if (nameCell && nameCell.v) {
        supplierName = String(nameCell.v).trim();
        if (supplierName) {
          supplierNames.set(normalizedCui, supplierName);
        }
      }
    }
    
    // Store only minimal raw data (CUI and name) instead of entire row to save memory
    rawDataMap.set(normalizedCui, {
      CUI: cuiValue,
      ...(supplierName ? { "Supplier Name": supplierName } : {}),
    });
    
    cuis.add(normalizedCui);
  }
  
  // Clear worksheet reference to help GC
  delete workbook.Sheets[firstSheetName];
  
  return { cuis, supplierNames, rawDataMap };
}

/**
 * SEAP XLSX Source
 */
export class SEAPXlsxSource implements IngestionSource {
  sourceId: SourceId = "SEAP_XLSX";
  
  async fetchBatch(cursor?: string, limit = 100): Promise<{
    records: SourceCompanyRecord[];
    nextCursor?: string;
  }> {
    const xlsxUrl = process.env.SEAP_XLSX_URL;
    if (!xlsxUrl) {
      throw new Error("SEAP_XLSX_URL environment variable not set");
    }
    
    // For XLSX files, we download the entire file once
    // Cursor represents whether we've already processed this file
    // If cursor is set, we've already processed this file - return empty
    if (cursor) {
      return { records: [], nextCursor: undefined };
    }
    
    // Fetch and parse XLSX
    const buffer = await fetchXlsx(xlsxUrl);
    const { cuis, supplierNames, rawDataMap } = parseXlsxAndExtractCuis(buffer, limit);
    
    // Convert to SourceCompanyRecord format
    const records: SourceCompanyRecord[] = [];
    const cuiArray = Array.from(cuis);
    let recordIndex = 0;
    
    for (const cui of cuiArray) {
      if (recordIndex >= limit) {
        break;
      }
      
      const rawRow = rawDataMap.get(cui) || {};
      
      records.push({
        sourceId: "SEAP_XLSX",
        sourceRef: `seap-xlsx-${cui}-${recordIndex}`,
        cui,
        name: supplierNames.get(cui) || null,
        countySlug: undefined,
        industrySlug: undefined,
        domain: undefined,
        address: undefined,
        contacts: undefined,
        metrics: undefined,
        lastSeenAt: new Date(),
        confidence: 60, // Medium-high confidence for SEAP data
        raw: rawRow,
      });
      
      recordIndex++;
    }
    
    // Mark as processed by setting cursor
    const nextCursor = cuis.size > 0 ? "processed" : undefined;
    
    return {
      records,
      nextCursor,
    };
  }
  
  async healthCheck(): Promise<boolean> {
    const xlsxUrl = process.env.SEAP_XLSX_URL;
    if (!xlsxUrl) {
      return false;
    }
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s for HEAD request
      
      const response = await fetch(xlsxUrl, {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "User-Agent": "RoMarketCap/1.0",
        },
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

