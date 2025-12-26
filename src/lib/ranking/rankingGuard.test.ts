/**
 * PROMPT 57: Extended tests for ranking guard (skeleton exclusion)
 */

import { describe, it, expect } from "vitest";
import { buildRankingGuard, shouldIncludeInRanking } from "./rankingGuard";

describe("buildRankingGuard - PROMPT 57 skeleton exclusion", () => {
  it("should exclude skeleton companies", () => {
    const guard = buildRankingGuard(false);

    expect(guard.where.isSkeleton).toBe(false);
  });
});

describe("shouldIncludeInRanking - PROMPT 57 skeleton exclusion", () => {
  it("should exclude skeleton companies", () => {
    const company = {
      isDemo: false,
      dataConfidence: 70,
      companyRiskFlags: [],
      isPublic: true,
      visibilityStatus: "PUBLIC",
      isSkeleton: true,
    };

    expect(shouldIncludeInRanking(company, false)).toBe(false);
  });

  it("should include non-skeleton companies", () => {
    const company = {
      isDemo: false,
      dataConfidence: 70,
      companyRiskFlags: [],
      isPublic: true,
      visibilityStatus: "PUBLIC",
      isSkeleton: false,
    };

    expect(shouldIncludeInRanking(company, false)).toBe(true);
  });
});
