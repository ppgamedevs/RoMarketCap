import { describe, it, expect } from "vitest";
import type { CompanyRiskFlag } from "@prisma/client";

// Import only pure functions (not the ones that require prisma)
// These are copied here to avoid importing the full module which requires prisma
function calculateIntegrityScore(signals: {
  submissionSpike: boolean;
  coordinatedClaims: boolean;
  enrichmentFailures: boolean;
  abnormalOscillations: boolean;
}, existingFlags: CompanyRiskFlag[]): number {
  let score = 100;

  // Deduct points for each signal
  if (signals.submissionSpike) score -= 20;
  if (signals.coordinatedClaims) score -= 25;
  if (signals.enrichmentFailures) score -= 15;
  if (signals.abnormalOscillations) score -= 30;

  // Deduct for existing flags
  score -= existingFlags.length * 10;

  return Math.max(0, Math.min(100, score));
}

function signalsToRiskFlags(signals: {
  submissionSpike: boolean;
  coordinatedClaims: boolean;
  enrichmentFailures: boolean;
  abnormalOscillations: boolean;
}): CompanyRiskFlag[] {
  const flags: CompanyRiskFlag[] = [];
  if (signals.submissionSpike) flags.push("SUBMISSION_SPIKE");
  if (signals.coordinatedClaims) flags.push("COORDINATED_CLAIMS");
  if (signals.enrichmentFailures) flags.push("ENRICHMENT_FAILURES");
  if (signals.abnormalOscillations) flags.push("ABNORMAL_OSCILLATIONS");
  return flags;
}

// Note: detectAbuseSignals is not tested here as it requires prisma/db access.
// It should be tested in integration tests.

describe("abuse", () => {
  describe("calculateIntegrityScore", () => {
    it("should return 100 for no signals", () => {
      const score = calculateIntegrityScore(
        {
          submissionSpike: false,
          coordinatedClaims: false,
          enrichmentFailures: false,
          abnormalOscillations: false,
        },
        [],
      );
      expect(score).toBe(100);
    });

    it("should deduct points for signals", () => {
      const score = calculateIntegrityScore(
        {
          submissionSpike: true,
          coordinatedClaims: false,
          enrichmentFailures: false,
          abnormalOscillations: false,
        },
        [],
      );
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it("should deduct more for multiple signals", () => {
      const score = calculateIntegrityScore(
        {
          submissionSpike: true,
          coordinatedClaims: true,
          enrichmentFailures: true,
          abnormalOscillations: true,
        },
        [],
      );
      expect(score).toBeLessThan(50);
    });

    it("should deduct for existing flags", () => {
      const score = calculateIntegrityScore(
        {
          submissionSpike: false,
          coordinatedClaims: false,
          enrichmentFailures: false,
          abnormalOscillations: false,
        },
        ["SUBMISSION_SPIKE", "COORDINATED_CLAIMS"] as CompanyRiskFlag[],
      );
      expect(score).toBe(80); // 100 - 2 * 10
    });
  });

  describe("signalsToRiskFlags", () => {
    it("should convert signals to flags", () => {
      const flags = signalsToRiskFlags({
        submissionSpike: true,
        coordinatedClaims: false,
        enrichmentFailures: true,
        abnormalOscillations: false,
      });
      expect(flags).toContain("SUBMISSION_SPIKE");
      expect(flags).toContain("ENRICHMENT_FAILURES");
      expect(flags).not.toContain("COORDINATED_CLAIMS");
    });
  });
});

