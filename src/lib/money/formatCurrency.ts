/**
 * Currency formatting utilities with compact notation
 * Supports RON and EUR with Romanian locale formatting
 */

export type Currency = "RON" | "EUR";

export interface FormatCurrencyOptions {
  currency?: Currency;
  locale?: "ro" | "en";
  compact?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

/**
 * Formats a number as currency with compact notation for large numbers
 * Examples:
 * - 500000 → "500.000 RON" (if compact=false) or "500K RON" (if compact=true)
 * - 551100000000 → "551,1 mld. RON" (Romanian) or "551.1B RON" (English)
 */
export function formatCurrency(
  value: number | null | undefined,
  options: FormatCurrencyOptions = {}
): string {
  if (value == null || !Number.isFinite(value)) {
    return "N/A";
  }

  const {
    currency = "RON",
    locale = "ro",
    compact = true,
    minimumFractionDigits = 0,
    maximumFractionDigits = 1,
  } = options;

  const num = Number(value);
  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (!compact) {
    // Standard formatting without compact notation
    try {
      return new Intl.NumberFormat(locale === "ro" ? "ro-RO" : "en-US", {
        style: "currency",
        currency,
        minimumFractionDigits,
        maximumFractionDigits: Math.max(minimumFractionDigits, maximumFractionDigits),
      }).format(num);
    } catch {
      return `${sign}${Math.round(absNum).toLocaleString(locale === "ro" ? "ro-RO" : "en-US")} ${currency}`;
    }
  }

  // Compact notation
  let formatted: string;
  let suffix = "";

  if (absNum >= 1_000_000_000_000) {
    // Trillion (mii de miliarde)
    formatted = (absNum / 1_000_000_000_000).toFixed(maximumFractionDigits);
    suffix = locale === "ro" ? " mii mld." : "T";
  } else if (absNum >= 1_000_000_000) {
    // Billion (miliarde)
    formatted = (absNum / 1_000_000_000).toFixed(maximumFractionDigits);
    suffix = locale === "ro" ? " mld." : "B";
  } else if (absNum >= 1_000_000) {
    // Million (milioane)
    formatted = (absNum / 1_000_000).toFixed(maximumFractionDigits);
    suffix = locale === "ro" ? " mln." : "M";
  } else if (absNum >= 1_000) {
    // Thousand
    formatted = (absNum / 1_000).toFixed(maximumFractionDigits);
    suffix = locale === "ro" ? " mii" : "K";
  } else {
    // Less than 1000
    formatted = absNum.toFixed(minimumFractionDigits);
  }

  // Format number with proper decimal separator for locale
  const formattedNum = formatted.replace(".", locale === "ro" ? "," : ".");

  // Add currency symbol/abbreviation
  const currencySymbol = currency === "EUR" ? "€" : locale === "ro" ? "RON" : "RON";

  return `${sign}${formattedNum}${suffix} ${currencySymbol}`;
}

/**
 * Legacy formatMoney function for backward compatibility
 */
export function formatMoney(
  n: number | null | undefined,
  currency: string,
  locale: string
): string {
  return formatCurrency(n, {
    currency: currency as Currency,
    locale: locale === "ro" || locale === "ro-RO" ? "ro" : "en",
    compact: false,
    maximumFractionDigits: 0,
  });
}
