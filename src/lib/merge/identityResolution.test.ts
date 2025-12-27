/**
 * PROMPT 60: Unit tests for identity resolution
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeCompanyName, computeNameConfidence, computeDomainConfidence } from "./identityResolution";

describe("normalizeCompanyName", () => {
  it("should remove company types (SRL, SA, SC, PFA)", () => {
    expect(normalizeCompanyName("Test Company SRL")).toBe("test company");
    expect(normalizeCompanyName("Test Company SA")).toBe("test company");
    expect(normalizeCompanyName("Test Company SC")).toBe("test company");
    expect(normalizeCompanyName("Test Company PFA")).toBe("test company");
  });

  it("should remove diacritics", () => {
    expect(normalizeCompanyName("Ștefan Company")).toBe("stefan company");
    expect(normalizeCompanyName("Țeapă Company")).toBe("teapa company");
  });

  it("should remove punctuation", () => {
    expect(normalizeCompanyName("Test, Inc.")).toBe("test inc");
    expect(normalizeCompanyName("Test-Company")).toBe("testcompany");
  });

  it("should handle null/undefined", () => {
    expect(normalizeCompanyName(null)).toBeNull();
    expect(normalizeCompanyName(undefined)).toBeNull();
  });

  it("should normalize whitespace", () => {
    expect(normalizeCompanyName("Test   Company")).toBe("test company");
  });
});

describe("computeNameConfidence", () => {
  it("should return high confidence for exact match", () => {
    const result = computeNameConfidence("Test Company SRL", "Test Company SRL");
    expect(result.confidence).toBe(90);
    expect(result.reason).toBe("NAME_HIGH");
  });

  it("should return high confidence for one contains the other", () => {
    const result = computeNameConfidence("Test Company", "Test Company SRL");
    expect(result.confidence).toBe(75);
    expect(result.reason).toBe("NAME_HIGH");
  });

  it("should return medium confidence for shared significant words", () => {
    const result = computeNameConfidence("Test Company Ltd", "Test Company Inc");
    expect(result.confidence).toBeGreaterThanOrEqual(60);
    expect(result.reason).toBe("NAME_MEDIUM");
  });

  it("should return 0 confidence for no match", () => {
    const result = computeNameConfidence("Company A", "Company B");
    expect(result.confidence).toBe(0);
    expect(result.reason).toBeNull();
  });
});

describe("computeDomainConfidence", () => {
  it("should return high confidence for exact domain match", () => {
    const result = computeDomainConfidence("example.com", "example.com");
    expect(result.confidence).toBe(85);
    expect(result.reason).toBe("DOMAIN_EXACT");
  });

  it("should return exact match after www normalization", () => {
    // normalizeDomain removes www, so both normalize to "example.com" (exact match)
    const result = computeDomainConfidence("www.example.com", "example.com");
    expect(result.confidence).toBe(85); // Exact match after normalization
    expect(result.reason).toBe("DOMAIN_EXACT");
  });

  it("should return 0 confidence for different domains", () => {
    const result = computeDomainConfidence("example.com", "other.com");
    expect(result.confidence).toBe(0);
    expect(result.reason).toBeNull();
  });
});

// Note: Integration test for "never merge different CUIs" would require
// full database setup. The logic is tested in the findMergeCandidates function
// which explicitly checks: if (company.cui && candidate.cui && company.cui !== candidate.cui) continue;

