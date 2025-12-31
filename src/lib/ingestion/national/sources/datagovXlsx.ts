/**
 * PROMPT 62: data.gov.ro XLSX Source Adapter
 * 
 * Downloads and parses XLSX files from data.gov.ro resources,
 * extracting CUI and company names from SEAP-related datasets.
 */

import type { SourceCompanyRecord } from "../../types";
import { normalizeCUI } from "../../cuiValidation";
import { kv } from "@vercel/kv";
import * as XLSX from "xlsx";
import { createHash } from "crypto";

// PROMPT 62: Default resource URL (can be overridden via env var)
const DEFAULT_DATAGOV_RESOURCE_URL = 
  "https://data.gov.ro/dataset/achizitii-publice-2025/resource/4ea2f0d0-ad5d-440f-af9d-7101bc9e4969";

// PROMPT 62: Max file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// PROMPT 62: Rate limiting: 1 download per 10 minutes per resource
const DOWNLOAD_COOLDOWN_MS = 10 * 60 * 1000;

/**
 * PROMPT 62: Normalize column header for matching
 */
function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * PROMPT 62: Detect CUI column index
 */
function findCuiColumn(headers: string[]): number | null {
  const cuiPatterns = [
    "cui",
    "cod fiscal",
    "cod unic",
    "cif",
    "cod unic de inregistrare",
    "cod unic inregistrare",
  ];

  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeHeader(headers[i]);
    if (cuiPatterns.some((pattern) => normalized.includes(pattern))) {
      return i;
    }
  }

  return null;
}

/**
 * PROMPT 62: Detect company name column index
 */
function findNameColumn(headers: string[]): number | null {
  const namePatterns = [
    "denumire operator economic",
    "denumire ofertant",
    "furnizor",
    "operator economic",
    "denumire",
    "nume",
    "companie",
    "firma",
  ];

  for (let i = 0; i < headers.length; i++) {
    const normalized = normalizeHeader(headers[i]);
    if (namePatterns.some((pattern) => normalized.includes(pattern))) {
      return i;
    }
  }

  return null;
}

/**
 * PROMPT 62: Resolve data.gov.ro resource URL to direct download URL
 */
async function resolveDownloadUrl(resourceUrl: string): Promise<string> {
  // If already a direct download URL, return as-is
  if (resourceUrl.includes("/download/")) {
    return resourceUrl;
  }

  // Try to construct download URL
  // Format: https://data.gov.ro/dataset/.../resource/.../download/...
  const match = resourceUrl.match(/\/resource\/([^\/]+)/);
  if (match) {
    const resourceId = match[1];
    // Try common download URL patterns
    const downloadUrl = resourceUrl.replace(/\/resource\/[^\/]+$/, `/resource/${resourceId}/download/`);
    
    // Test if URL is accessible (HEAD request)
    try {
      const response = await fetch(downloadUrl, { method: "HEAD", signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        return downloadUrl;
      }
    } catch {
      // Fallback to original URL
    }
  }

  // If resolution fails, try the resource URL directly (might work)
  return resourceUrl;
}

/**
 * PROMPT 62: Check if we should download (rate limiting)
 */
async function shouldDownload(resourceUrl: string): Promise<boolean> {
  const cacheKey = `datagov:download:${createHash("sha256").update(resourceUrl).digest("hex")}`;
  const lastDownload = await kv.get<number>(cacheKey).catch(() => null);

  if (lastDownload) {
    const elapsed = Date.now() - lastDownload;
    if (elapsed < DOWNLOAD_COOLDOWN_MS) {
      return false; // Too soon, skip download
    }
  }

  // Mark download time
  await kv.set(cacheKey, Date.now(), { ex: 3600 }).catch(() => null); // Expire after 1 hour
  return true;
}

/**
 * PROMPT 62: Download XLSX file
 */
async function downloadXlsx(downloadUrl: string): Promise<Buffer> {
  console.log(`[datagov-xlsx] Downloading from ${downloadUrl}`);

  const response = await fetch(downloadUrl, {
    signal: AbortSignal.timeout(60000), // 60 seconds timeout
  });

  if (!response.ok) {
    throw new Error(`Failed to download XLSX: ${response.status} ${response.statusText}`);
  }

  // Check content length
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${contentLength} bytes (max: ${MAX_FILE_SIZE})`);
  }

  // Read response with size limit
  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  if (!response.body) {
    throw new Error("No response body");
  }

  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    totalSize += value.length;
    if (totalSize > MAX_FILE_SIZE) {
      reader.cancel();
      throw new Error(`File size exceeded limit: ${totalSize} bytes`);
    }

    chunks.push(value);
  }

  // Combine chunks
  const allChunks = new Uint8Array(totalSize);
  let offset = 0;
  for (const chunk of chunks) {
    allChunks.set(chunk, offset);
    offset += chunk.length;
  }

  return Buffer.from(allChunks);
}

/**
 * PROMPT 62: Parse XLSX and extract company records
 */
function parseXlsx(buffer: Buffer, resourceUrl: string): SourceCompanyRecord[] {
  const records: SourceCompanyRecord[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error("No sheets found in XLSX");
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: "" });

    if (data.length === 0) {
      return records;
    }

    // First row is headers
    const headers = (data[0] || []).map((h) => String(h || ""));
    const cuiColumnIndex = findCuiColumn(headers);
    const nameColumnIndex = findNameColumn(headers);

    if (cuiColumnIndex === null) {
      console.warn(`[datagov-xlsx] No CUI column found in headers: ${headers.join(", ")}`);
      return records;
    }

    console.log(`[datagov-xlsx] Found columns: CUI=${cuiColumnIndex}, Name=${nameColumnIndex ?? "N/A"}`);

    // Process rows (skip header)
    for (let rowIndex = 1; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex] || [];
      const rawCui = String(row[cuiColumnIndex] || "").trim();

      if (!rawCui) {
        continue; // Skip rows without CUI
      }

      // Normalize CUI
      const normalizedCui = normalizeCUI(rawCui);
      if (!normalizedCui) {
        continue; // Invalid CUI, skip
      }

      // Extract name if available
      let name: string | null = null;
      if (nameColumnIndex !== null) {
        const rawName = String(row[nameColumnIndex] || "").trim();
        if (rawName && rawName.length > 0) {
          // Cap name length to 500 chars
          name = rawName.substring(0, 500);
        }
      }

      // Compute row hash for provenance
      const rowImportantFields = {
        cui: normalizedCui,
        name: name || null,
        rowIndex,
      };
      const rowHash = createHash("sha256")
        .update(resourceUrl + JSON.stringify(rowImportantFields))
        .digest("hex");

      records.push({
        sourceId: "DATAGOV_SEAP",
        sourceRef: `${resourceUrl}#row${rowIndex}`,
        cui: normalizedCui,
        name,
        countySlug: undefined,
        industrySlug: undefined,
        domain: undefined,
        address: undefined,
        contacts: undefined,
        metrics: undefined,
        lastSeenAt: new Date(),
        confidence: 60, // Medium-high confidence for data.gov.ro
        raw: {
          resourceUrl,
          rowIndex,
          rowHash,
          headers,
          rawRow: row,
        },
      });
    }

    console.log(`[datagov-xlsx] Parsed ${records.length} records from XLSX`);
  } catch (error) {
    console.error(`[datagov-xlsx] Error parsing XLSX:`, error);
    throw error;
  }

  return records;
}

/**
 * PROMPT 62: data.gov.ro XLSX Source
 */
export class DataGovXlsxSource implements IngestionSource {
  sourceId: SourceId = "DATAGOV_SEAP";

  /**
   * Get resource URLs from environment or use default
   */
  private getResourceUrls(): string[] {
    const envUrls = process.env.DATAGOV_RESOURCE_URLS;
    if (envUrls) {
      return envUrls.split(",").map((url) => url.trim()).filter((url) => url.length > 0);
    }
    return [DEFAULT_DATAGOV_RESOURCE_URL];
  }

  async fetchBatch(
    cursor?: string,
    limit = 100,
    options?: { forceReprocess?: boolean }
  ): Promise<{
    records: SourceCompanyRecord[];
    nextCursor?: string;
  }> {
    const records: SourceCompanyRecord[] = [];
    const resourceUrls = this.getResourceUrls();

    // PROMPT 62: For XLSX sources, cursor represents which resource we're processing
    // If cursor exists, we've already processed all resources
    if (cursor && !options?.forceReprocess) {
      return { records, nextCursor: undefined };
    }

    // Process each resource URL
    for (const resourceUrl of resourceUrls) {
      try {
        // Check rate limiting
        if (!options?.forceReprocess && !(await shouldDownload(resourceUrl))) {
          console.log(`[datagov-xlsx] Skipping ${resourceUrl}: rate limited`);
          continue;
        }

        // Resolve download URL
        const downloadUrl = await resolveDownloadUrl(resourceUrl);
        console.log(`[datagov-xlsx] Resolved download URL: ${downloadUrl}`);

        // Download XLSX
        const buffer = await downloadXlsx(downloadUrl);

        // Parse XLSX
        const resourceRecords = parseXlsx(buffer, resourceUrl);

        // Add to records (respect limit)
        for (const record of resourceRecords) {
          if (records.length >= limit) {
            break;
          }
          records.push(record);
        }

        // If we've reached the limit, mark cursor for next resource
        if (records.length >= limit) {
          const nextResourceIndex = resourceUrls.indexOf(resourceUrl) + 1;
          if (nextResourceIndex < resourceUrls.length) {
            return {
              records,
              nextCursor: `resource:${nextResourceIndex}`,
            };
          }
        }
      } catch (error) {
        console.error(`[datagov-xlsx] Error processing resource ${resourceUrl}:`, error);
        // Continue with next resource
      }
    }

    // All resources processed
    return {
      records,
      nextCursor: undefined,
    };
  }

  async healthCheck(): Promise<boolean> {
    try {
      const resourceUrls = this.getResourceUrls();
      if (resourceUrls.length === 0) {
        return false;
      }

      // Try to resolve first resource URL
      const downloadUrl = await resolveDownloadUrl(resourceUrls[0]);
      const response = await fetch(downloadUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}

// Import types
import type { IngestionSource } from "../../sources";
import type { SourceId } from "../../types";
