import { z } from "zod";
import { createHash } from "crypto";

/**
 * CSV row schema for company import.
 * Minimal required fields: name, cui (or domain).
 */
export const CompanyImportRowSchema = z.object({
  name: z.string().min(1).max(500),
  cui: z.string().optional(),
  domain: z.string().url().optional().or(z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i).optional()),
  county: z.string().optional(),
  countySlug: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
  industrySlug: z.string().optional(),
  website: z.string().url().optional().or(z.string().regex(/^https?:\/\/.+/i).optional()),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  caenCode: z.string().optional(),
  caenDescription: z.string().optional(),
  legalName: z.string().optional(),
  tradeName: z.string().optional(),
  foundedYear: z.coerce.number().int().min(1800).max(2100).optional(),
  employeeCountEstimate: z.coerce.number().int().min(0).optional(),
});

export type CompanyImportRow = z.infer<typeof CompanyImportRowSchema>;

/**
 * Parse CSV header row and return column indices.
 */
export function parseCsvHeader(headerLine: string): Map<string, number> {
  const columns = headerLine.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  const map = new Map<string, number>();
  columns.forEach((col, idx) => {
    // Normalize column names (case-insensitive, handle common variations)
    const normalized = col.toLowerCase().replace(/[_\s]+/g, "_");
    map.set(normalized, idx);
  });
  return map;
}

/**
 * Parse CSV row into object using header map.
 */
export function parseCsvRow(rowLine: string, headerMap: Map<string, number>): Record<string, string> {
  const values = rowLine.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
  const obj: Record<string, string> = {};
  headerMap.forEach((idx, key) => {
    if (idx < values.length) {
      obj[key] = values[idx] || "";
    }
  });
  return obj;
}

/**
 * Compute hash of row data for provenance tracking.
 */
export function hashRow(row: Record<string, unknown>): string {
  const json = JSON.stringify(row, Object.keys(row).sort());
  return createHash("sha256").update(json).digest("hex").slice(0, 16);
}

