/**
 * PROMPT 56: Tests for ranking guard
 */

import { describe, it, expect } from "vitest";
import { buildRankingGuard, shouldIncludeInRanking } from "./rankingGuard";

describe("buildRankingGuard", () => {
  it("should exclude DEMO companies in launch mode", () => {
    const guard = buildRankingGuard(true);

    expect(guard.where.isDemo).toBe(false);
  });

  it("should require minimum data confidence", () => {
    const guard = buildRankingGuard(false);

    expect(guard.where.dataConfidence).toEqual({ gte: 40 });
  });

  it("should exclude risk flags", () => {
    const guard = buildRankingGuard(false);

    expect(guard.where.NOT?.companyRiskFlags).toEqual({
      hasSome: expect.arrayContaining(["SUSPICIOUS_ACTIVITY"]),
    });
  });

  it("should have deterministic orderBy", () => {
    const guard = buildRankingGuard(false);

    expect(guard.orderBy).toHaveLength(4);
    expect(guard.orderBy[0]).toEqual({ romcAiScore: "desc" });
    expect(guard.orderBy[1]).toEqual({ dataConfidence: "desc" });
    expect(guard.orderBy[2]).toEqual({ lastScoredAt: "desc" });
    expect(guard.orderBy[3]).toEqual({ cui: "asc" });
  });
});

describe("shouldIncludeInRanking", () => {
  it("should include valid company", () => {
    const company = {
      isDemo: false,
      dataConfidence: 70,
      companyRiskFlags: [],
      isPublic: true,
      visibilityStatus: "PUBLIC",
    };

    expect(shouldIncludeInRanking(company, false)).toBe(true);
  });

  it("should exclude DEMO in launch mode", () => {
    const company = {
      isDemo: true,
      dataConfidence: 70,
      companyRiskFlags: [],
      isPublic: true,
      visibilityStatus: "PUBLIC",
    };

    expect(shouldIncludeInRanking(company, true)).toBe(false);
  });

  it("should exclude low confidence", () => {
    const company = {
      isDemo: false,
      dataConfidence: 30,
      companyRiskFlags: [],
      isPublic: true,
      visibilityStatus: "PUBLIC",
    };

    expect(shouldIncludeInRanking(company, false)).toBe(false);
  });

  it("should exclude companies with risk flags", () => {
    const company = {
      isDemo: false,
      dataConfidence: 70,
      companyRiskFlags: ["SUSPICIOUS_ACTIVITY"],
      isPublic: true,
      visibilityStatus: "PUBLIC",
    };

    expect(shouldIncludeInRanking(company, false)).toBe(false);
  });

  it("should exclude non-public companies", () => {
    const company = {
      isDemo: false,
      dataConfidence: 70,
      companyRiskFlags: [],
      isPublic: false,
      visibilityStatus: "PRIVATE",
    };

    expect(shouldIncludeInRanking(company, false)).toBe(false);
  });
});

