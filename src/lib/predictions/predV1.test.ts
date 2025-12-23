import { describe, expect, test } from "vitest";
import { computePredV1 } from "./predV1";

describe("pred-v1", () => {
  test("no history yields stable forecast near base +/- fundamentals", () => {
    const out = computePredV1({
      romcScore: 60,
      romcConfidence: 60,
      employees: null,
      revenueLatest: null,
      profitLatest: null,
      industrySlug: null,
      countySlug: null,
      lastScoredAt: null,
      history: [],
    });
    const f30 = out.find((x) => x.horizonDays === 30)!;
    expect(f30.forecastScore).toBeGreaterThanOrEqual(40);
    expect(f30.forecastScore).toBeLessThanOrEqual(80);
  });

  test("positive slope increases forecast", () => {
    const now = new Date("2025-01-10T00:00:00Z");
    const prev = new Date("2025-01-05T00:00:00Z");
    const out = computePredV1({
      romcScore: 60,
      romcConfidence: 70,
      employees: 20,
      revenueLatest: 1_000_000,
      profitLatest: 100_000,
      industrySlug: "software",
      countySlug: "cluj",
      lastScoredAt: now,
      history: [
        { recordedAt: now, romcScore: 60 },
        { recordedAt: prev, romcScore: 58 },
      ],
    });
    const f90 = out.find((x) => x.horizonDays === 90)!;
    expect(f90.forecastScore).toBeGreaterThanOrEqual(60);
  });

  test("negative profit reduces forecast via fundamentals penalty", () => {
    const out = computePredV1({
      romcScore: 60,
      romcConfidence: 70,
      employees: 20,
      revenueLatest: 1_000_000,
      profitLatest: -10_000,
      industrySlug: null,
      countySlug: null,
      lastScoredAt: new Date(),
      history: [],
    });
    const f30 = out.find((x) => x.horizonDays === 30)!;
    expect(f30.forecastScore).toBeLessThanOrEqual(60);
  });

  test("confidence increases with more history points", () => {
    const base = {
      romcScore: 50,
      romcConfidence: 50,
      employees: null,
      revenueLatest: null,
      profitLatest: null,
      industrySlug: null,
      countySlug: null,
      lastScoredAt: null,
    };
    const a = computePredV1({ ...base, history: [{ recordedAt: new Date("2025-01-02"), romcScore: 50 }] });
    const b = computePredV1({
      ...base,
      history: [
        { recordedAt: new Date("2025-01-05"), romcScore: 50 },
        { recordedAt: new Date("2025-01-04"), romcScore: 50 },
        { recordedAt: new Date("2025-01-03"), romcScore: 50 },
        { recordedAt: new Date("2025-01-02"), romcScore: 50 },
      ],
    });
    expect(b[0]!.forecastConfidence).toBeGreaterThanOrEqual(a[0]!.forecastConfidence);
  });
});


