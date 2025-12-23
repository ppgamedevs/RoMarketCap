import { describe, expect, test } from "vitest";
import { scoreCompanyV0 } from "./scoreCompany";
import type { CompanyMetrics } from "@prisma/client";

const baseCompany = { id: "c1", slug: "x", name: "X", website: "https://x.ro" } as const;

function metrics(overrides: Partial<CompanyMetrics> = {}): CompanyMetrics {
  return {
    id: "m1",
    companyId: "c1",
    employeesCount: 50,
    revenueLastYear: 10_000_000,
    profitLastYear: 1_000_000,
    seapContractsCount: 10,
    seapContractsValue: 5_000_000,
    linkedinFollowers: 1000,
    linkedinGrowth90d: 0.2,
    websiteTrafficMonthly: 200_000,
    mentions30d: 20,
    fundingSignals: 1,
    updatedAt: new Date(),
    ...overrides,
  } as unknown as CompanyMetrics;
}

describe("scoreCompanyV0", () => {
  test("handles null metrics safely (no NaN)", () => {
    const r = scoreCompanyV0({ company: baseCompany, metrics: null, now: new Date("2025-01-01") });
    expect(Number.isFinite(r.romcScore)).toBe(true);
    expect(Number.isFinite(r.romcAiScore)).toBe(true);
    expect(Number.isFinite(r.confidence)).toBe(true);
  });

  test("extremes clamp into 0..100", () => {
    const r = scoreCompanyV0({
      company: baseCompany,
      metrics: metrics({
        employeesCount: 999999,
        revenueLastYear: 9999999999,
        profitLastYear: 9999999999,
        websiteTrafficMonthly: 999999999,
        mentions30d: 999999,
        linkedinGrowth90d: 9,
        seapContractsValue: 9999999999,
        seapContractsCount: 999999,
      }),
    });
    expect(r.romcScore).toBeGreaterThanOrEqual(0);
    expect(r.romcScore).toBeLessThanOrEqual(100);
    expect(r.romcAiScore).toBeGreaterThanOrEqual(0);
    expect(r.romcAiScore).toBeLessThanOrEqual(100);
    expect(r.confidence).toBeGreaterThanOrEqual(0);
    expect(r.confidence).toBeLessThanOrEqual(100);
  });

  test("negative profit triggers penalty and reduces score", () => {
    const pos = scoreCompanyV0({ company: baseCompany, metrics: metrics({ profitLastYear: 500_000 }) });
    const neg = scoreCompanyV0({ company: baseCompany, metrics: metrics({ profitLastYear: -500_000 }) });
    expect(neg.romcScore).toBeLessThan(pos.romcScore);
  });

  test("missing website reduces confidence", () => {
    const a = scoreCompanyV0({ company: baseCompany, metrics: metrics() });
    const b = scoreCompanyV0({ company: { ...baseCompany, website: null }, metrics: metrics() });
    expect(b.confidence).toBeLessThanOrEqual(a.confidence);
  });

  test("recency affects confidence", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    const fresh = scoreCompanyV0({
      company: baseCompany,
      metrics: metrics({ updatedAt: new Date("2024-12-31T00:00:00Z") }),
      now,
    });
    const stale = scoreCompanyV0({
      company: baseCompany,
      metrics: metrics({ updatedAt: new Date("2024-06-01T00:00:00Z") }),
      now,
    });
    expect(stale.confidence).toBeLessThan(fresh.confidence);
  });
});


