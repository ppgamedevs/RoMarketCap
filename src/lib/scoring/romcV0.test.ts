import { describe, expect, test } from "vitest";
import { romcV0 } from "./romcV0";

describe("romcV0", () => {
  test("handles missing inputs and keeps scores in range", () => {
    const out = romcV0({
      revenue: null,
      profit: null,
      employees: null,
      assets: null,
      liabilities: null,
      signals: [],
      now: new Date("2025-01-01T00:00:00Z"),
    });
    expect(out.romcScore).toBeGreaterThanOrEqual(0);
    expect(out.romcScore).toBeLessThanOrEqual(100);
    expect(out.confidence).toBeGreaterThanOrEqual(30);
    expect(out.confidence).toBeLessThanOrEqual(90);
    expect(out.explanationRo).toContain("Estimare");
    expect(out.explanationEn).toContain("estimate");
  });

  test("negative profit increases risk and can reduce score", () => {
    const base = romcV0({
      revenue: 10_000_000,
      profit: 1_000_000,
      employees: 50,
      assets: 5_000_000,
      liabilities: 1_000_000,
      signals: [],
      now: new Date("2025-01-01T00:00:00Z"),
    });
    const neg = romcV0({
      revenue: 10_000_000,
      profit: -1_000_000,
      employees: 50,
      assets: 5_000_000,
      liabilities: 1_000_000,
      signals: [],
      now: new Date("2025-01-01T00:00:00Z"),
    });
    expect(neg.riskScore).toBeGreaterThanOrEqual(base.riskScore);
    expect(neg.romcScore).toBeLessThanOrEqual(base.romcScore);
  });

  test("liabilities greater than assets increases risk", () => {
    const out = romcV0({
      revenue: 10_000_000,
      profit: 500_000,
      employees: 20,
      assets: 1_000_000,
      liabilities: 2_000_000,
      signals: [],
      now: new Date("2025-01-01T00:00:00Z"),
    });
    expect(out.riskScore).toBeGreaterThan(20);
  });
});


