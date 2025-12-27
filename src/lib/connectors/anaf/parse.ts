/**
 * PROMPT 58: Parse ANAF Web Service Response
 * 
 * Parses the ANAF financial statements response into normalized format.
 * Handles missing fields, invalid data, and computes confidence scores.
 */

import type { ANAFFinancialData } from "./types";

/**
 * Clamp absurd values to reasonable ranges
 */
function clampValue(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * Parse numeric value from ANAF response
 */
function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === "string") {
    // Remove currency symbols, spaces, commas
    const cleaned = value.replace(/[^\d.-]/g, "");
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Extract year from date string or number
 */
function extractYear(value: unknown): number | null {
  if (typeof value === "number") {
    if (value >= 1900 && value <= 2100) return value;
    return null;
  }
  if (typeof value === "string") {
    // Try to parse date string
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      if (year >= 1900 && year <= 2100) return year;
    }
    // Try to parse as year number
    const yearNum = parseInt(value, 10);
    if (yearNum >= 1900 && yearNum <= 2100) return yearNum;
  }
  return null;
}

/**
 * Compute confidence score based on data completeness
 */
function computeConfidence(data: {
  revenue: number | null;
  profit: number | null;
  employees: number | null;
}): number {
  let score = 0;
  if (data.revenue !== null) score += 40;
  if (data.profit !== null) score += 30;
  if (data.employees !== null) score += 30;
  return Math.min(100, score);
}

/**
 * Parse ANAF financial statements response
 * 
 * Note: The actual ANAF API response format may vary.
 * This parser handles common patterns and missing fields gracefully.
 * 
 * @param rawResponse Raw response from ANAF web service
 * @returns Array of normalized financial data per year
 */
export function parseANAFResponse(rawResponse: unknown): ANAFFinancialData[] {
  if (!rawResponse || typeof rawResponse !== "object") {
    throw new Error("Invalid response: not an object");
  }

  const response = rawResponse as Record<string, unknown>;
  const results: ANAFFinancialData[] = [];

  // ANAF response may contain:
  // - Single year data in root object
  // - Array of years
  // - Nested structure with "situatii_financiare" or similar

  // Try to extract year from response
  const year = extractYear(response.an || response.year || response.anul || response.data) || 
               new Date().getFullYear() - 1; // Default to last year if not found

  // Extract financial indicators
  // Field names may vary: "cifra_afaceri", "venituri", "CA", "profit", "pierdere", "angajati", "numar_angajati"
  const revenueRaw = response.cifra_afaceri || response.venituri || response.CA || 
                     response.cifraAfaceri || response.venituriTotal || response.revenue;
  const profitRaw = response.profit || response.pierdere || response.profitNet || 
                    response.pierdereNeta || response.profit || response.netIncome;
  const employeesRaw = response.angajati || response.numar_angajati || response.numAngajati || 
                       response.employees || response.employeeCount;

  // Parse and sanitize values
  const revenue = parseNumeric(revenueRaw);
  const profit = parseNumeric(profitRaw);
  const employees = parseNumeric(employeesRaw);

  // Clamp absurd values
  const clampedRevenue = revenue !== null ? clampValue(revenue, 0, 1e12) : null; // Max 1 trillion RON
  const clampedProfit = profit !== null ? clampValue(profit, -1e12, 1e12) : null; // Can be negative
  const clampedEmployees = employees !== null ? clampValue(employees, 0, 1e6) : null; // Max 1 million employees

  // Compute confidence
  const confidence = computeConfidence({
    revenue: clampedRevenue,
    profit: clampedProfit,
    employees: clampedEmployees,
  });

  // Only add if we have at least some data
  if (clampedRevenue !== null || clampedProfit !== null || clampedEmployees !== null) {
    results.push({
      year,
      revenue: clampedRevenue,
      profit: clampedProfit,
      employees: clampedEmployees,
      currency: "RON", // Default to RON for Romanian companies
      confidence,
      rawResponse,
    });
  }

  // If response contains multiple years (array or nested structure)
  if (Array.isArray(response.situatii_financiare) || Array.isArray(response.years)) {
    const yearsArray = (response.situatii_financiare || response.years) as unknown[];
    for (const yearData of yearsArray) {
      if (typeof yearData === "object" && yearData !== null) {
        const yearYear = extractYear(yearData.an || yearData.year || yearData.anul) || year;
        const yearRevenue = parseNumeric(yearData.cifra_afaceri || yearData.venituri || yearData.CA);
        const yearProfit = parseNumeric(yearData.profit || yearData.pierdere || yearData.profitNet);
        const yearEmployees = parseNumeric(yearData.angajati || yearData.numar_angajati || yearData.employees);

        const clampedYearRevenue = yearRevenue !== null ? clampValue(yearRevenue, 0, 1e12) : null;
        const clampedYearProfit = yearProfit !== null ? clampValue(yearProfit, -1e12, 1e12) : null;
        const clampedYearEmployees = yearEmployees !== null ? clampValue(yearEmployees, 0, 1e6) : null;

        const yearConfidence = computeConfidence({
          revenue: clampedYearRevenue,
          profit: clampedYearProfit,
          employees: clampedYearEmployees,
        });

        if (clampedYearRevenue !== null || clampedYearProfit !== null || clampedYearEmployees !== null) {
          results.push({
            year: yearYear,
            revenue: clampedYearRevenue,
            profit: clampedYearProfit,
            employees: clampedYearEmployees,
            currency: "RON",
            confidence: yearConfidence,
            rawResponse: yearData,
          });
        }
      }
    }
  }

  if (results.length === 0) {
    throw new Error("No financial data found in response");
  }

  return results;
}

