import type { CompanyRiskFlag } from "@prisma/client";
import { prisma } from "@/src/lib/db";

type AbuseSignals = {
  submissionSpike: boolean;
  coordinatedClaims: boolean;
  enrichmentFailures: boolean;
  abnormalOscillations: boolean;
};

/**
 * Detect abuse signals for a company.
 */
export async function detectAbuseSignals(companyId: string, days = 7): Promise<AbuseSignals> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [submissions, claims, company, scoreHistory] = await Promise.all([
    prisma.companySubmission.findMany({
      where: { companyId, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.companyClaim.findMany({
      where: { companyId, createdAt: { gte: since } },
      select: { createdAt: true, userId: true },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { enrichVersion: true, lastEnrichedAt: true },
    }),
    prisma.companyScoreHistory.findMany({
      where: { companyId, recordedAt: { gte: since } },
      orderBy: { recordedAt: "asc" },
      select: { romcScore: true, recordedAt: true },
      take: 30,
    }),
  ]);

  // Submission spike: >5 submissions in 7 days
  const submissionSpike = submissions.length > 5;

  // Coordinated claims: >3 claims from different users in 7 days
  const uniqueClaimUsers = new Set(claims.map((c) => c.userId));
  const coordinatedClaims = uniqueClaimUsers.size > 3;

  // Enrichment failures: enrichVersion hasn't increased in 30 days despite attempts
  const enrichmentFailures =
    company != null && company.enrichVersion != null && company.lastEnrichedAt != null && Date.now() - company.lastEnrichedAt.getTime() > 30 * 24 * 60 * 60 * 1000;

  // Abnormal oscillations: score changes direction >3 times in 7 days with >10 point swings
  let abnormalOscillations = false;
  if (scoreHistory.length >= 4) {
    let directionChanges = 0;
    for (let i = 1; i < scoreHistory.length; i++) {
      const prev = scoreHistory[i - 1].romcScore;
      const curr = scoreHistory[i].romcScore;
      const next = scoreHistory[i + 1]?.romcScore;
      if (next != null) {
        const delta1 = curr - prev;
        const delta2 = next - curr;
        if (Math.abs(delta1) >= 10 && Math.abs(delta2) >= 10 && Math.sign(delta1) !== Math.sign(delta2)) {
          directionChanges++;
        }
      }
    }
    abnormalOscillations = directionChanges >= 3;
  }

  return {
    submissionSpike,
    coordinatedClaims,
    enrichmentFailures: enrichmentFailures ?? false,
    abnormalOscillations,
  };
}

/**
 * Calculate integrity score (0-100) based on abuse signals.
 * Higher = more trustworthy.
 */
export function calculateIntegrityScore(signals: AbuseSignals, existingFlags: CompanyRiskFlag[]): number {
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

/**
 * Convert abuse signals to risk flags.
 */
export function signalsToRiskFlags(signals: AbuseSignals): CompanyRiskFlag[] {
  const flags: CompanyRiskFlag[] = [];
  if (signals.submissionSpike) flags.push("SUBMISSION_SPIKE");
  if (signals.coordinatedClaims) flags.push("COORDINATED_CLAIMS");
  if (signals.enrichmentFailures) flags.push("ENRICHMENT_FAILURES");
  if (signals.abnormalOscillations) flags.push("ABNORMAL_OSCILLATIONS");
  return flags;
}

