export type RomcScoreV0Result = {
  romc_score: number; // 0..100
  valuation_low_eur: number | null;
  valuation_high_eur: number | null;
  confidence: number; // 0..100
  risk_flags: string[];
  liquidity_signals: string[];
  inputs_snapshot: Record<string, unknown>;
};

export type RomcScoreV0Input = {
  websiteUrl?: string | null;
  foundedYear?: number | null;
  employeesEstimate?: number | null;
  revenueLast?: number | string | null;
  profitLast?: number | string | null;
  currency?: string | null;
};

const RON_PER_EUR = 5; // placeholder FX; replace with real FX later

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function toNumberDecimalLike(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  // Prisma Decimal serializes to string via toString()
  if (typeof value === "object" && value && "toString" in value) {
    const s = String((value as { toString: () => string }).toString());
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function computeRomcScoreV0(company: Pick<
  RomcScoreV0Input,
  "websiteUrl" | "foundedYear" | "employeesEstimate" | "revenueLast" | "profitLast" | "currency"
>): RomcScoreV0Result {
  const revenueRon = toNumberDecimalLike(company.revenueLast);
  const profitRon = toNumberDecimalLike(company.profitLast);
  const employees = company.employeesEstimate ?? null;

  const risk_flags: string[] = [];
  const liquidity_signals: string[] = ["FOUNDER_OPEN_UNKNOWN"];

  if (!revenueRon) risk_flags.push("MISSING_REVENUE");
  if (!company.websiteUrl) risk_flags.push("MISSING_WEBSITE");
  if (!employees && employees !== 0) risk_flags.push("MISSING_EMPLOYEE_COUNT");
  if (typeof employees === "number" && employees < 5) risk_flags.push("LOW_EMPLOYEE_COUNT");

  // Base score from revenue + employees (log-ish so it scales).
  let score = 25;
  if (revenueRon && revenueRon > 0) {
    score += clamp(Math.log10(revenueRon) * 10 - 40, 0, 35);
  }
  if (typeof employees === "number" && employees > 0) {
    score += clamp(Math.log10(employees) * 12, 0, 20);
  }

  // Small explainable bonuses
  if (company.websiteUrl) score += 4;
  if (company.foundedYear && new Date().getFullYear() - company.foundedYear >= 3) score += 4;
  if (profitRon != null && profitRon > 0) score += 3;
  if (profitRon != null && profitRon < 0) score -= 3;

  score = clamp(Math.round(score), 0, 100);

  // Confidence depends on completeness.
  let confidence = 45;
  if (revenueRon != null) confidence += 25;
  if (employees != null) confidence += 15;
  if (company.websiteUrl) confidence += 10;
  confidence -= risk_flags.length * 4;
  confidence = clamp(Math.round(confidence), 0, 100);

  // Valuation heuristic: revenue multiple if available, else employee multiple.
  let valuation_low_eur: number | null = null;
  let valuation_high_eur: number | null = null;

  if (revenueRon && revenueRon > 0) {
    const revenueEur = revenueRon / RON_PER_EUR;
    valuation_low_eur = revenueEur * 0.6;
    valuation_high_eur = revenueEur * 2.2;
  } else if (employees && employees > 0) {
    valuation_low_eur = employees * 25_000;
    valuation_high_eur = employees * 80_000;
  }

  if (valuation_low_eur != null && valuation_high_eur != null) {
    valuation_low_eur = Math.round(valuation_low_eur);
    valuation_high_eur = Math.round(valuation_high_eur);
  }

  const inputs_snapshot: Record<string, unknown> = {
    revenue_last: revenueRon,
    profit_last: profitRon,
    employees_estimate: employees,
    founded_year: company.foundedYear ?? null,
    website_present: Boolean(company.websiteUrl),
    currency: company.currency ?? null,
    fx_ron_per_eur: RON_PER_EUR,
  };

  return {
    romc_score: score,
    valuation_low_eur,
    valuation_high_eur,
    confidence,
    risk_flags,
    liquidity_signals,
    inputs_snapshot,
  };
}


