import { describe, it, expect } from "vitest";
import { calculateSearchScore } from "./rank";

describe("calculateSearchScore", () => {
  const baseCompany = {
    name: "Test Company SRL",
    cui: "12345678",
    slug: "test-company-srl",
    website: "https://test.com",
    dataConfidence: 80,
    lastEnrichedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
  };

  it("should give highest score for exact name match", () => {
    const score1 = calculateSearchScore(baseCompany, "test company srl", ["test", "company", "srl"]);
    const score2 = calculateSearchScore(baseCompany, "test", ["test"]);
    expect(score1).toBeGreaterThan(score2);
  });

  it("should boost by exact CUI match", () => {
    const score = calculateSearchScore(baseCompany, "12345678", ["12345678"]);
    expect(score).toBeGreaterThan(500);
  });

  it("should boost by data confidence", () => {
    const highConf = calculateSearchScore({ ...baseCompany, dataConfidence: 100 }, "test", ["test"]);
    const lowConf = calculateSearchScore({ ...baseCompany, dataConfidence: 50 }, "test", ["test"]);
    expect(highConf).toBeGreaterThan(lowConf);
  });

  it("should boost by recency", () => {
    const recent = calculateSearchScore(
      { ...baseCompany, lastEnrichedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
      "test",
      ["test"],
    );
    const old = calculateSearchScore(
      { ...baseCompany, lastEnrichedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      "test",
      ["test"],
    );
    expect(recent).toBeGreaterThan(old);
  });

  it("should handle startsWith match", () => {
    const score = calculateSearchScore(baseCompany, "test company", ["test", "company"]);
    expect(score).toBeGreaterThan(200);
  });

  it("should handle token matching", () => {
    const score = calculateSearchScore(baseCompany, "test srl", ["test", "srl"]);
    expect(score).toBeGreaterThan(100);
  });
});

