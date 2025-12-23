import { describe, expect, test } from "vitest";
import { computeRomcScoreV0 } from "./computeRomcScoreV0";

describe("computeRomcScoreV0", () => {
  test("scores higher when revenue and employees are present", () => {
    const a = computeRomcScoreV0({
      revenueLast: 5_000_000,
      profitLast: 400_000,
      employeesEstimate: 80,
      foundedYear: 2015,
      websiteUrl: "https://example.ro",
      currency: "RON",
    });
    const b = computeRomcScoreV0({
      revenueLast: null,
      profitLast: null,
      employeesEstimate: null,
      foundedYear: null,
      websiteUrl: null,
      currency: "RON",
    });
    expect(a.romc_score).toBeGreaterThan(b.romc_score);
    expect(a.confidence).toBeGreaterThan(b.confidence);
  });

  test("adds risk flags for missing revenue and website", () => {
    const r = computeRomcScoreV0({
      revenueLast: null,
      profitLast: null,
      employeesEstimate: 10,
      foundedYear: 2020,
      websiteUrl: null,
      currency: "RON",
    });
    expect(r.risk_flags).toContain("MISSING_REVENUE");
    expect(r.risk_flags).toContain("MISSING_WEBSITE");
  });

  test("low employee count gets flagged", () => {
    const r = computeRomcScoreV0({
      revenueLast: 200_000,
      profitLast: 10_000,
      employeesEstimate: 3,
      foundedYear: 2022,
      websiteUrl: "https://x.ro",
      currency: "RON",
    });
    expect(r.risk_flags).toContain("LOW_EMPLOYEE_COUNT");
  });

  test("valuation uses revenue multiple when revenue exists", () => {
    const r = computeRomcScoreV0({
      revenueLast: 5_000_000,
      profitLast: 200_000,
      employeesEstimate: 10,
      foundedYear: 2010,
      websiteUrl: "https://x.ro",
      currency: "RON",
    });
    expect(r.valuation_low_eur).not.toBeNull();
    expect(r.valuation_high_eur).not.toBeNull();
    expect((r.valuation_high_eur ?? 0)!).toBeGreaterThan((r.valuation_low_eur ?? 0)!);
  });

  test("valuation falls back to employees when revenue missing", () => {
    const r = computeRomcScoreV0({
      revenueLast: null,
      profitLast: null,
      employeesEstimate: 20,
      foundedYear: 2010,
      websiteUrl: "https://x.ro",
      currency: "RON",
    });
    expect(r.valuation_low_eur).toBe(20 * 25_000);
    expect(r.valuation_high_eur).toBe(20 * 80_000);
  });
});


