import { clamp, normalizeMinMax, toFiniteNumber } from "./scoring/normalize";

export type RomcV1Input = {
  website?: string | null;
  foundedYear?: number | null;
  employees?: number | null;
  revenueLatest?: unknown;
  profitLatest?: unknown;
  description?: string | null;
  county?: string | null;
  city?: string | null;
  metricsCount?: number;
};

export type RomcV1Output = {
  score: number; // 0..100
  confidence: number; // 0..100
  components: Record<string, unknown>;
  valuationRangeLow: number | null;
  valuationRangeHigh: number | null;
  valuationCurrency: "EUR";
};

const RON_PER_EUR = 5; // placeholder FX

export function computeROMC(input: RomcV1Input, now = new Date()): RomcV1Output {
  const revenueRon = toFiniteNumber(input.revenueLatest);
  const profitRon = toFiniteNumber(input.profitLatest);
  const employees = input.employees ?? null;
  const ageYears = input.foundedYear ? Math.max(0, now.getFullYear() - input.foundedYear) : null;

  let score = 50;

  // Website presence
  if (input.website) score += 6;

  // Age (0..10)
  if (ageYears != null) score += Math.round(10 * normalizeMinMax(ageYears, 0, 25));

  // Employees (0..12)
  if (employees != null) score += Math.round(12 * normalizeMinMax(employees, 0, 2000));

  // Revenue (0..18)
  if (revenueRon != null) score += Math.round(18 * normalizeMinMax(revenueRon, 0, 200_000_000));

  // Profit quality (-8..+8) via margin
  let margin = 0;
  if (revenueRon != null && revenueRon > 0 && profitRon != null) margin = profitRon / revenueRon;
  score += Math.round(-8 + 16 * normalizeMinMax(margin, -0.2, 0.3));

  // Description sanity (0..4)
  const dlen = (input.description ?? "").trim().length;
  if (dlen >= 80) score += 4;
  else if (dlen >= 20) score += 2;

  // Location completeness (0..4)
  if (input.county) score += 2;
  if (input.city) score += 2;

  score = clamp(score, 0, 100);

  // Confidence (0..100): field completeness + metrics presence.
  const present = [
    Boolean(input.website),
    input.foundedYear != null,
    employees != null,
    revenueRon != null,
    profitRon != null,
    dlen >= 20,
    Boolean(input.county),
    Boolean(input.city),
  ].filter(Boolean).length;

  const base = 35 + present * 6; // 35..83
  const metricsBoost = Math.min(15, (input.metricsCount ?? 0) * 5); // 0..15
  const confidence = clamp(Math.round(base + metricsBoost), 20, 95);

  // Valuation range (EUR) derived from revenue, conservative multiples.
  let valuationRangeLow: number | null = null;
  let valuationRangeHigh: number | null = null;
  if (revenueRon != null && revenueRon > 0) {
    const revenueEur = revenueRon / RON_PER_EUR;
    const profitable = profitRon != null && profitRon > 0;
    const lowMultiple = profitable ? 0.7 : 0.35;
    const highMultiple = profitable ? 1.4 : 0.8;
    valuationRangeLow = Math.round(revenueEur * lowMultiple);
    valuationRangeHigh = Math.round(revenueEur * highMultiple);
  }

  const components = {
    version: "romc_v1",
    inputs: {
      websitePresent: Boolean(input.website),
      foundedYear: input.foundedYear ?? null,
      ageYears,
      employees,
      revenueRon,
      profitRon,
      margin,
      descriptionLength: dlen,
      countyPresent: Boolean(input.county),
      cityPresent: Boolean(input.city),
      metricsCount: input.metricsCount ?? 0,
    },
    outputs: {
      score,
      confidence,
      valuationRangeLow,
      valuationRangeHigh,
      valuationCurrency: "EUR",
    },
    notes: ["Deterministic v1. Multipliers and FX are placeholders."],
  };

  return { score, confidence, components, valuationRangeLow, valuationRangeHigh, valuationCurrency: "EUR" };
}


