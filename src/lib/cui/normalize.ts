/**
 * PROMPT 54: CUI Normalization Utilities
 * 
 * Normalizes Romanian CUI (Cod Unic de Înregistrare) formats
 * and validates format (not checksum - ANAF verification confirms existence)
 */

/**
 * Normalize CUI input to digits-only format
 * 
 * Accepts formats:
 * - RO12345678
 * - 12345678
 * - "1234 5678" (with spaces)
 * - "1234.5678" (with dots)
 * 
 * Returns digits only (no RO prefix) OR null if invalid
 */
export function normalizeCui(input: string | null | undefined): string | null {
  if (!input) {
    return null;
  }

  // Convert to string and trim
  const str = String(input).trim();

  if (str.length === 0) {
    return null;
  }

  // Remove RO prefix (case insensitive)
  let digits = str.replace(/^RO/i, "").trim();

  // Remove all non-digit characters (spaces, dots, dashes, etc.)
  digits = digits.replace(/\D/g, "");

  // Check if we have any digits left
  if (digits.length === 0) {
    return null;
  }

  // Validate format
  if (!isValidCuiFormat(digits)) {
    return null;
  }

  return digits;
}

/**
 * Validate CUI format (not checksum)
 * 
 * Romanian CUI length rules:
 * - 2-10 digits typical
 * - Reject obvious garbage:
 *   - All same digit (e.g., "11111111")
 *   - Too short (< 2 digits)
 *   - Too long (> 10 digits)
 * 
 * This is format validation only, not checksum.
 * ANAF verification will confirm existence.
 */
export function isValidCuiFormat(cuiDigits: string): boolean {
  if (!cuiDigits || typeof cuiDigits !== "string") {
    return false;
  }

  // Must be 2-10 digits
  if (cuiDigits.length < 2 || cuiDigits.length > 10) {
    return false;
  }

  // Must be all digits
  if (!/^\d+$/.test(cuiDigits)) {
    return false;
  }

  // Reject if all digits are the same (obvious garbage)
  const firstDigit = cuiDigits[0];
  if (cuiDigits.split("").every((d) => d === firstDigit)) {
    return false;
  }

  return true;
}

/**
 * Format CUI for display (adds RO prefix)
 */
export function formatCuiForDisplay(cuiDigits: string | null): string {
  if (!cuiDigits) {
    return "";
  }
  return `RO${cuiDigits}`;
}
