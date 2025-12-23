import { describe, it, expect } from "vitest";
import { calculateStabilityProfile, smoothScoreEwma, smoothScoreCapped, calculateScoreDelta } from "./stability";

describe("stability", () => {
  describe("calculateStabilityProfile", () => {
    it("should return LOW for stable scores", () => {
      expect(calculateStabilityProfile([1, 0.5, -1, 0.8, -0.5])).toBe("LOW");
    });

    it("should return MEDIUM for moderate volatility", () => {
      expect(calculateStabilityProfile([3, -2, 4, -3, 2])).toBe("MEDIUM");
    });

    it("should return HIGH for high volatility", () => {
      expect(calculateStabilityProfile([10, -8, 12, -10, 15])).toBe("HIGH");
    });

    it("should return MEDIUM for empty array", () => {
      expect(calculateStabilityProfile([])).toBe("MEDIUM");
    });
  });

  describe("smoothScoreEwma", () => {
    it("should return current score if no previous", () => {
      expect(smoothScoreEwma(80, null)).toBe(80);
    });

    it("should apply smoothing", () => {
      const result = smoothScoreEwma(90, 80, 0.3);
      expect(result).toBeGreaterThan(80);
      expect(result).toBeLessThan(90);
    });
  });

  describe("smoothScoreCapped", () => {
    it("should return current score if no previous", () => {
      expect(smoothScoreCapped(80, null)).toBe(80);
    });

    it("should cap large increases", () => {
      const result = smoothScoreCapped(100, 50, 7); // 50% increase, but cap is 7%
      expect(result).toBeLessThan(100);
      expect(result).toBeLessThanOrEqual(50 + Math.round((50 * 7) / 100));
    });

    it("should cap large decreases", () => {
      const result = smoothScoreCapped(30, 80, 7); // 62.5% decrease, but cap is 7%
      expect(result).toBeGreaterThan(30);
      expect(result).toBeGreaterThanOrEqual(80 - Math.round((80 * 7) / 100));
    });

    it("should allow small changes", () => {
      const result = smoothScoreCapped(54, 50, 7); // 8% increase, within cap
      expect(result).toBe(54);
    });
  });

  describe("calculateScoreDelta", () => {
    it("should calculate delta", () => {
      expect(calculateScoreDelta(90, 80)).toBe(10);
      expect(calculateScoreDelta(70, 80)).toBe(-10);
    });

    it("should return null if either is null", () => {
      expect(calculateScoreDelta(null, 80)).toBeNull();
      expect(calculateScoreDelta(90, null)).toBeNull();
    });
  });
});

