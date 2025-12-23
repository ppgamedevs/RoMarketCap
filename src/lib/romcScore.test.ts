import { describe, expect, test } from "vitest";
import { computeROMC } from "./romcScore";

describe("computeROMC v1", () => {
  test("clamps score and confidence", () => {
    const out = computeROMC({
      website: null,
      foundedYear: null,
      employees: null,
      revenueLatest: null,
      profitLatest: null,
      description: null,
      county: null,
      city: null,
      metricsCount: 0,
    });
    expect(out.score).toBeGreaterThanOrEqual(0);
    expect(out.score).toBeLessThanOrEqual(100);
    expect(out.confidence).toBeGreaterThanOrEqual(0);
    expect(out.confidence).toBeLessThanOrEqual(100);
  });

  test("profit positive yields higher valuation multiples than negative profit", () => {
    const a = computeROMC({ revenueLatest: 10_000_000, profitLatest: 1_000_000 });
    const b = computeROMC({ revenueLatest: 10_000_000, profitLatest: -1_000_000 });
    expect(a.valuationRangeHigh ?? 0).toBeGreaterThan(b.valuationRangeHigh ?? 0);
  });
});


