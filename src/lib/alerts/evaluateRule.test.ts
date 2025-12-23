import { describe, it, expect, vi, beforeEach } from "vitest";
import { evaluateAlertRuleSync, evaluateAlertRule } from "./evaluateRule";
import type { UserAlertRule } from "@prisma/client";
import { prisma } from "@/src/lib/db";

// Mock prisma for async tests
vi.mock("@/src/lib/db", () => ({
  prisma: {
    companyScoreHistory: {
      findFirst: vi.fn(),
    },
  },
}));

describe("evaluateAlertRuleSync", () => {
  it("should return false for inactive rules", () => {
    const rule: UserAlertRule = {
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user1",
      name: "Test",
      metric: "ROMC_AI",
      operator: "GT",
      threshold: 80,
      scope: "COMPANY",
      companyId: null,
      industrySlug: null,
      countySlug: null,
      lookbackDays: null,
      active: false,
    };

    const company = { romcAiScore: 90, valuationRangeLow: null, valuationRangeHigh: null };
    expect(evaluateAlertRuleSync(rule, company)).toBe(false);
  });

  it("should evaluate GT operator correctly", () => {
    const rule: UserAlertRule = {
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user1",
      name: "Test",
      metric: "ROMC_AI",
      operator: "GT",
      threshold: 80,
      scope: "COMPANY",
      companyId: null,
      industrySlug: null,
      countySlug: null,
      lookbackDays: null,
      active: true,
    };

    expect(evaluateAlertRuleSync(rule, { romcAiScore: 90, valuationRangeLow: null, valuationRangeHigh: null })).toBe(true);
    expect(evaluateAlertRuleSync(rule, { romcAiScore: 70, valuationRangeLow: null, valuationRangeHigh: null })).toBe(false);
    expect(evaluateAlertRuleSync(rule, { romcAiScore: null, valuationRangeLow: null, valuationRangeHigh: null })).toBe(false);
  });

  it("should evaluate LT operator correctly", () => {
    const rule: UserAlertRule = {
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user1",
      name: "Test",
      metric: "ROMC_AI",
      operator: "LT",
      threshold: 50,
      scope: "COMPANY",
      companyId: null,
      industrySlug: null,
      countySlug: null,
      lookbackDays: null,
      active: true,
    };

    expect(evaluateAlertRuleSync(rule, { romcAiScore: 40, valuationRangeLow: null, valuationRangeHigh: null })).toBe(true);
    expect(evaluateAlertRuleSync(rule, { romcAiScore: 60, valuationRangeLow: null, valuationRangeHigh: null })).toBe(false);
  });

  it("should evaluate VALUATION metric correctly", () => {
    const rule: UserAlertRule = {
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user1",
      name: "Test",
      metric: "VALUATION",
      operator: "GT",
      threshold: 1000000,
      scope: "COMPANY",
      companyId: null,
      industrySlug: null,
      countySlug: null,
      lookbackDays: null,
      active: true,
    };

    expect(
      evaluateAlertRuleSync(rule, {
        romcAiScore: null,
        valuationRangeLow: 500000,
        valuationRangeHigh: 2000000,
      }),
    ).toBe(true); // Midpoint is 1.25M > 1M
    expect(
      evaluateAlertRuleSync(rule, {
        romcAiScore: null,
        valuationRangeLow: 500000,
        valuationRangeHigh: 800000,
      }),
    ).toBe(false); // Midpoint is 650K < 1M
  });

  it("should return false for PCT_CHANGE operator (requires async)", () => {
    const rule: UserAlertRule = {
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user1",
      name: "Test",
      metric: "ROMC_AI",
      operator: "PCT_CHANGE",
      threshold: 10,
      scope: "COMPANY",
      companyId: null,
      industrySlug: null,
      countySlug: null,
      lookbackDays: 7,
      active: true,
    };

    expect(evaluateAlertRuleSync(rule, { romcAiScore: 90, valuationRangeLow: null, valuationRangeHigh: null })).toBe(false);
  });
});

describe("evaluateAlertRule (async)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return false for PCT_CHANGE when no baseline found", async () => {
    const rule: UserAlertRule = {
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user1",
      name: "Test",
      metric: "ROMC_AI",
      operator: "PCT_CHANGE",
      threshold: 10,
      scope: "COMPANY",
      companyId: "company1",
      industrySlug: null,
      countySlug: null,
      lookbackDays: 7,
      active: true,
    };

    vi.mocked(prisma.companyScoreHistory.findFirst).mockResolvedValue(null);

    const result = await evaluateAlertRule(rule, { romcAiScore: 90, valuationRangeLow: null, valuationRangeHigh: null }, "company1");
    expect(result).toBe(false);
  });

  it("should trigger PCT_CHANGE when change exceeds threshold (positive)", async () => {
    const rule: UserAlertRule = {
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user1",
      name: "Test",
      metric: "ROMC_AI",
      operator: "PCT_CHANGE",
      threshold: 10, // 10% change
      scope: "COMPANY",
      companyId: "company1",
      industrySlug: null,
      countySlug: null,
      lookbackDays: 7,
      active: true,
    };

    // Baseline: 80, current: 90, change: +12.5% > 10%
    vi.mocked(prisma.companyScoreHistory.findFirst).mockResolvedValue({
      romcScore: 80,
      valuationRangeLow: null,
      valuationRangeHigh: null,
    } as { romcScore: number | null; valuationRangeLow: number | null; valuationRangeHigh: number | null });

    const result = await evaluateAlertRule(rule, { romcAiScore: 90, valuationRangeLow: null, valuationRangeHigh: null }, "company1");
    expect(result).toBe(true);
  });

  it("should not trigger PCT_CHANGE when change is below threshold", async () => {
    const rule: UserAlertRule = {
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user1",
      name: "Test",
      metric: "ROMC_AI",
      operator: "PCT_CHANGE",
      threshold: 10,
      scope: "COMPANY",
      companyId: "company1",
      industrySlug: null,
      countySlug: null,
      lookbackDays: 7,
      active: true,
    };

    // Baseline: 80, current: 85, change: +6.25% < 10%
    vi.mocked(prisma.companyScoreHistory.findFirst).mockResolvedValue({
      romcScore: 80,
      valuationRangeLow: null,
      valuationRangeHigh: null,
    } as { romcScore: number | null; valuationRangeLow: number | null; valuationRangeHigh: number | null });

    const result = await evaluateAlertRule(rule, { romcAiScore: 85, valuationRangeLow: null, valuationRangeHigh: null }, "company1");
    expect(result).toBe(false);
  });

  it("should trigger PCT_CHANGE for negative changes (absolute value)", async () => {
    const rule: UserAlertRule = {
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user1",
      name: "Test",
      metric: "ROMC_AI",
      operator: "PCT_CHANGE",
      threshold: 10,
      scope: "COMPANY",
      companyId: "company1",
      industrySlug: null,
      countySlug: null,
      lookbackDays: 7,
      active: true,
    };

    // Baseline: 100, current: 85, change: -15% (abs > 10%)
    vi.mocked(prisma.companyScoreHistory.findFirst).mockResolvedValue({
      romcScore: 100,
      valuationRangeLow: null,
      valuationRangeHigh: null,
    } as { romcScore: number | null; valuationRangeLow: number | null; valuationRangeHigh: number | null });

    const result = await evaluateAlertRule(rule, { romcAiScore: 85, valuationRangeLow: null, valuationRangeHigh: null }, "company1");
    expect(result).toBe(true);
  });

  it("should handle VALUATION metric with PCT_CHANGE", async () => {
    const rule: UserAlertRule = {
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user1",
      name: "Test",
      metric: "VALUATION",
      operator: "PCT_CHANGE",
      threshold: 20,
      scope: "COMPANY",
      companyId: "company1",
      industrySlug: null,
      countySlug: null,
      lookbackDays: 7,
      active: true,
    };

    // Baseline: 1M, current: 1.3M (midpoint), change: +30% > 20%
    vi.mocked(prisma.companyScoreHistory.findFirst).mockResolvedValue({
      romcScore: null,
      valuationRangeLow: 1000000,
      valuationRangeHigh: 1000000,
    } as { romcScore: number | null; valuationRangeLow: number | null; valuationRangeHigh: number | null });

    const result = await evaluateAlertRule(
      rule,
      { romcAiScore: null, valuationRangeLow: 1200000, valuationRangeHigh: 1400000 },
      "company1",
    );
    expect(result).toBe(true);
  });

  it("should handle baseline of zero using max(1, abs(baseline))", async () => {
    const rule: UserAlertRule = {
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user1",
      name: "Test",
      metric: "ROMC_AI",
      operator: "PCT_CHANGE",
      threshold: 10,
      scope: "COMPANY",
      companyId: "company1",
      industrySlug: null,
      countySlug: null,
      lookbackDays: 7,
      active: true,
    };

    // Baseline: 0, current: 10
    // Formula: (10 - 0) / max(1, abs(0)) * 100 = 10 / 1 * 100 = 1000%
    // This exceeds 10% threshold, so should trigger
    vi.mocked(prisma.companyScoreHistory.findFirst).mockResolvedValue({
      romcScore: 0,
      valuationRangeLow: null,
      valuationRangeHigh: null,
    } as { romcScore: number | null; valuationRangeLow: number | null; valuationRangeHigh: number | null });

    const result = await evaluateAlertRule(rule, { romcAiScore: 10, valuationRangeLow: null, valuationRangeHigh: null }, "company1");
    // With baseline 0, any non-zero current value will result in a huge percentage change
    expect(result).toBe(true);
  });

  it("should use custom lookbackDays when provided", async () => {
    const rule: UserAlertRule = {
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: "user1",
      name: "Test",
      metric: "ROMC_AI",
      operator: "PCT_CHANGE",
      threshold: 10,
      scope: "COMPANY",
      companyId: "company1",
      industrySlug: null,
      countySlug: null,
      lookbackDays: 14, // 14 days instead of default 7
      active: true,
    };

    vi.mocked(prisma.companyScoreHistory.findFirst).mockResolvedValue({
      romcScore: 80,
      valuationRangeLow: null,
      valuationRangeHigh: null,
    } as { romcScore: number | null; valuationRangeLow: number | null; valuationRangeHigh: number | null });

    const result = await evaluateAlertRule(rule, { romcAiScore: 90, valuationRangeLow: null, valuationRangeHigh: null }, "company1");
    expect(result).toBe(true);

    // Verify lookback date was calculated correctly (14 days ago)
    const callArgs = vi.mocked(prisma.companyScoreHistory.findFirst).mock.calls[0]?.[0] as
      | { where?: { recordedAt?: { lte?: Date } } }
      | undefined;
    expect(callArgs?.where?.recordedAt?.lte).toBeInstanceOf(Date);
    const lookbackDate = callArgs?.where?.recordedAt?.lte as Date;
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - 14);
    expect(Math.abs(lookbackDate.getTime() - expectedDate.getTime())).toBeLessThan(1000); // Within 1 second
  });
});
