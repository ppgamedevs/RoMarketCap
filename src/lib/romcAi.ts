import { clamp } from "@/src/lib/scoring/normalize";

export type RomcAiInput = {
  website: string | null;
  industrySlug: string | null;
  countySlug: string | null;
  employees: number | null;
  revenueLatest: unknown;
  profitLatest: unknown;
  descriptionRo: string | null;
  lastScoredAt: Date | null;
  approvedClaimCount: number;
  approvedSubmissionCount: number;
  now?: Date;
};

export type RomcAiOutput = {
  score: number; // 0..100
  components: Record<string, unknown>;
};

function toFinite(n: unknown): number | null {
  if (n == null) return null;
  const x = typeof n === "number" ? n : Number(String(n));
  return Number.isFinite(x) ? x : null;
}

export function computeRomcAi(input: RomcAiInput): RomcAiOutput {
  const now = input.now ?? new Date();
  const rev = toFinite(input.revenueLatest);
  const prof = toFinite(input.profitLatest);

  const hasWebsite = Boolean(input.website);
  const hasIndustry = Boolean(input.industrySlug);
  const hasCounty = Boolean(input.countySlug);
  const hasEmployees = input.employees != null;
  const hasRevenue = rev != null;
  const hasProfit = prof != null;
  const hasDesc = (input.descriptionRo ?? "").trim().length >= 40;

  const keyFields = [hasEmployees, hasRevenue, hasProfit, hasIndustry, hasCounty, hasWebsite, hasDesc];
  const completenessScore = Math.round((keyFields.filter(Boolean).length / keyFields.length) * 100);

  const daysSinceScored =
    input.lastScoredAt != null ? Math.max(0, Math.round((now.getTime() - input.lastScoredAt.getTime()) / (1000 * 60 * 60 * 24))) : 999;
  const freshness = clamp(100 - daysSinceScored * 5, 0, 100); // 0..100, decays fast

  const hasClaimsVerified = input.approvedClaimCount > 0;
  const submissionsQuality = clamp(input.approvedSubmissionCount * 20, 0, 100);

  // Weighted mix, designed to correlate with trust/discoverability, not duplicate ROMC.
  let score = 0;
  score += hasWebsite ? 18 : 0;
  score += hasClaimsVerified ? 18 : 0;
  score += Math.round(submissionsQuality * 0.12); // up to 12
  score += Math.round(freshness * 0.18); // up to 18
  score += Math.round(completenessScore * 0.28); // up to 28
  score += hasIndustry ? 3 : 0;
  score += hasCounty ? 3 : 0;

  score = clamp(Math.round(score), 0, 100);

  const components = {
    version: "romc_ai_v1",
    inputs: {
      hasWebsite,
      hasClaimsVerified,
      approvedSubmissionCount: input.approvedSubmissionCount,
      daysSinceScored,
      freshness,
      completenessScore,
      hasIndustry,
      hasCounty,
      hasEmployees,
      hasRevenue,
      hasProfit,
      hasDesc,
    },
    weights: {
      website: 18,
      claimsVerified: 18,
      submissionsQualityMax: 12,
      freshnessMax: 18,
      completenessMax: 28,
      industry: 3,
      county: 3,
    },
    outputs: { score },
    notes: ["Deterministic. Designed for trust and momentum signals, separate from ROMC v1."],
  };

  return { score, components };
}


