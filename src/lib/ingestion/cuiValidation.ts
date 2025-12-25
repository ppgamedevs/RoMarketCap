/**
 * CUI (Cod Unic de Înregistrare) validation for Romanian companies.
 * CUI format: RO followed by 2-10 digits, or just 2-10 digits.
 */

const CUI_PATTERN = /^(RO)?(\d{2,10})$/i;

export function isValidCUI(cui: string | null | undefined): boolean {
  if (!cui) return false;
  const trimmed = cui.trim();
  if (trimmed.length < 2 || trimmed.length > 12) return false;
  return CUI_PATTERN.test(trimmed);
}

export function normalizeCUI(cui: string | null | undefined): string | null {
  if (!cui) return null;
  const trimmed = cui.trim().toUpperCase();
  if (!isValidCUI(trimmed)) return null;
  // Remove RO prefix if present, standardize format
  const match = trimmed.match(CUI_PATTERN);
  if (!match) return null;
  return match[2]!; // Return just the digits
}

export function formatCUI(cui: string | null | undefined): string | null {
  const normalized = normalizeCUI(cui);
  if (!normalized) return null;
  return `RO${normalized}`;
}

