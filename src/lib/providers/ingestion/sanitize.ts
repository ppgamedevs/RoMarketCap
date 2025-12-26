/**
 * PROMPT 53: Sanitization helper for raw snapshots
 * 
 * Whitelist keys and cap JSON size to 8KB
 */

import { createHash } from "crypto";

/**
 * Whitelist of allowed keys in sanitized payloads
 */
const ALLOWED_KEYS = new Set([
  "name",
  "cui",
  "domain",
  "county",
  "industry",
  "employees",
  "revenue",
  "profit",
  "currency",
  "year",
  "url",
  "description",
  "phone",
  "email",
  "address",
]);

/**
 * Maximum size for sanitized JSON (8KB)
 */
const MAX_SIZE_BYTES = 8 * 1024;

/**
 * Truncate string to max length
 */
function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + "...";
}

/**
 * Sanitize a value (recursively handle objects and arrays)
 */
function sanitizeValue(value: unknown, depth = 0): unknown {
  // Prevent deep nesting
  if (depth > 3) {
    return "[truncated]";
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    // Truncate long strings
    return truncateString(value, 500);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    // Limit array size
    return value.slice(0, 10).map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(obj)) {
      // Only include whitelisted keys
      if (ALLOWED_KEYS.has(key.toLowerCase())) {
        sanitized[key] = sanitizeValue(val, depth + 1);
      }
    }

    return sanitized;
  }

  // For other types, convert to string and truncate
  return truncateString(String(value), 200);
}

/**
 * Sanitize a raw payload
 * 
 * @param payload - Raw payload from provider
 * @returns Sanitized payload (whitelisted keys only, capped size)
 */
export function sanitizePayload(payload: unknown): { sanitized: Record<string, unknown>; sizeBytes: number } {
  const sanitized = sanitizeValue(payload) as Record<string, unknown>;
  const jsonString = JSON.stringify(sanitized);
  let sizeBytes = Buffer.byteLength(jsonString, "utf8");

  // If still too large, truncate further
  if (sizeBytes > MAX_SIZE_BYTES) {
    // Remove keys until we're under the limit
    const keys = Object.keys(sanitized);
    for (const key of keys.reverse()) {
      delete sanitized[key];
      const newJson = JSON.stringify(sanitized);
      sizeBytes = Buffer.byteLength(newJson, "utf8");
      if (sizeBytes <= MAX_SIZE_BYTES) {
        break;
      }
    }

    // If still too large, truncate the entire JSON string
    if (sizeBytes > MAX_SIZE_BYTES) {
      const truncated = jsonString.substring(0, MAX_SIZE_BYTES - 3) + "...";
      return {
        sanitized: JSON.parse(truncated),
        sizeBytes: MAX_SIZE_BYTES,
      };
    }
  }

  return { sanitized, sizeBytes };
}

/**
 * Generate SHA256 hash of a stable JSON representation
 * 
 * @param payload - Payload to hash
 * @returns SHA256 hash (hex string)
 */
export function sha256StableJson(payload: unknown): string {
  // Sort keys for stable hashing
  const sorted = JSON.stringify(payload, Object.keys(payload as Record<string, unknown>).sort());
  return createHash("sha256").update(sorted, "utf8").digest("hex");
}

