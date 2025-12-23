import type { Company, CompanyMetrics } from "@prisma/client";
import { SCORING_CONSTANTS_V0 } from "./constants";
import { clamp, daysSince, normalizeMinMax, toFiniteNumber } from "./normalize";

export type ScoreCompanyResult = {
  romcScore: number; // 0..100
  romcAiScore: number; // 0..100
  confidence: number; // 0..100
  components: Record<string, unknown>;
};

type ScoreInput = {
  company: Pick<Company, "id" | "slug" | "name" | "website">;
  metrics: CompanyMetrics | null;
  now?: Date;
};

function todayDateUtc(d: Date): Date {
  // Stored as Date in Prisma with @db.Date; we normalize to UTC date boundary.
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function scoreCompanyV0({ company, metrics, now = new Date() }: ScoreInput): ScoreCompanyResult {
  const c = SCORING_CONSTANTS_V0;

  const employees = metrics?.employeesCount ?? null;
  const revenue = toFiniteNumber(metrics?.revenueLastYear);
  const profit = toFiniteNumber(metrics?.profitLastYear);
  const seapCount = metrics?.seapContractsCount ?? null;
  const seapValue = toFiniteNumber(metrics?.seapContractsValue);
  const followers = metrics?.linkedinFollowers ?? null;
  const linkedinGrowth = metrics?.linkedinGrowth90d ?? null;
  const traffic = metrics?.websiteTrafficMonthly ?? null;
  const mentions = metrics?.mentions30d ?? null;
  const fundingSignals = metrics?.fundingSignals ?? null;

  // Normalized features (0..1)
  const nEmployees = normalizeMinMax(employees, c.employeesCount.min, c.employeesCount.max);
  const nRevenue = normalizeMinMax(revenue, c.revenueLastYear.min, c.revenueLastYear.max);
  const nProfit = normalizeMinMax(profit, c.profitLastYear.min, c.profitLastYear.max);
  const nTraffic = normalizeMinMax(traffic, c.websiteTrafficMonthly.min, c.websiteTrafficMonthly.max);
  const nMentions = normalizeMinMax(mentions, c.mentions30d.min, c.mentions30d.max);
  const nLinkedinGrowth = normalizeMinMax(linkedinGrowth, c.linkedinGrowth90d.min, c.linkedinGrowth90d.max);
  const nSeapValue = normalizeMinMax(seapValue, c.seapContractsValue.min, c.seapContractsValue.max);
  const nSeapCount = normalizeMinMax(seapCount, c.seapContractsCount.min, c.seapContractsCount.max);

  const riskFlags: string[] = [];
  if (metrics == null) riskFlags.push("MISSING_METRICS");
  if (revenue == null) riskFlags.push("MISSING_REVENUE");
  if (!company.website) riskFlags.push("MISSING_WEBSITE");
  if (employees == null) riskFlags.push("MISSING_EMPLOYEES");
  if (profit != null && profit < 0) riskFlags.push("NEGATIVE_PROFIT");

  // Fundamentals (0..40)
  // Profit contributes positively, negative profit is handled via risk penalty.
  const fundamentals = 40 * (0.5 * nRevenue + 0.3 * clamp(nProfit, 0, 1) + 0.2 * nEmployees);

  // Traction (0..30)
  const traction = 30 * (0.45 * nTraffic + 0.35 * nMentions + 0.2 * nLinkedinGrowth);

  // Public money (0..20)
  const publicMoney = 20 * (0.7 * nSeapValue + 0.3 * nSeapCount);

  // Risk penalty (0..10) subtracts from score
  let penalty = 0;
  if (profit != null && profit < 0) penalty += 5;
  if (!company.website) penalty += 2;
  if (employees != null && employees < 5) penalty += 2;
  if (revenue == null) penalty += 2;
  penalty = clamp(penalty, 0, 10);

  const romcScore = clamp(Math.round(fundamentals + traction + publicMoney - penalty), 0, 100);

  // ROMC AI score (0..100): market narrative + momentum, deterministic.
  // Uses growth, mentions, traffic, plus a small boost for fundingSignals.
  const fundingBoost = clamp((fundingSignals ?? 0) / 10, 0, 1);
  const romcAiScore = clamp(Math.round(100 * (0.35 * nLinkedinGrowth + 0.35 * nMentions + 0.2 * nTraffic + 0.1 * fundingBoost)), 0, 100);

  // Confidence: completeness + recency.
  const fieldsPresent = [
    employees != null,
    revenue != null,
    profit != null,
    seapCount != null,
    seapValue != null,
    followers != null,
    linkedinGrowth != null,
    traffic != null,
    mentions != null,
    fundingSignals != null,
  ].filter(Boolean).length;

  const completeness = fieldsPresent / 10;

  const ageDays = daysSince(metrics?.updatedAt, now);
  // 0 days -> 1.0, 30 days -> ~0.6, 90 days -> ~0.25
  const recency = ageDays == null ? 0.25 : clamp(1 / (1 + ageDays / 20), 0, 1);

  let confidence = 100 * (0.7 * completeness + 0.3 * recency);
  confidence -= riskFlags.length * 2;
  confidence = clamp(Math.round(confidence), 0, 100);

  const components = {
    version: "score-v0",
    asOfDate: todayDateUtc(now).toISOString().slice(0, 10),
    normalized: {
      employeesCount: nEmployees,
      revenueLastYear: nRevenue,
      profitLastYear: nProfit,
      websiteTrafficMonthly: nTraffic,
      mentions30d: nMentions,
      linkedinGrowth90d: nLinkedinGrowth,
      seapContractsValue: nSeapValue,
      seapContractsCount: nSeapCount,
      fundingBoost,
    },
    raw: {
      employeesCount: employees,
      revenueLastYear: revenue,
      profitLastYear: profit,
      seapContractsCount: seapCount,
      seapContractsValue: seapValue,
      linkedinFollowers: followers,
      linkedinGrowth90d: linkedinGrowth,
      websiteTrafficMonthly: traffic,
      mentions30d: mentions,
      fundingSignals,
    },
    subScores: {
      fundamentals,
      traction,
      publicMoney,
      penalty,
    },
    riskFlags,
    weights: {
      fundamentalsMax: 40,
      tractionMax: 30,
      publicMoneyMax: 20,
      riskPenaltyMax: 10,
      romcAiWeights: { linkedinGrowth90d: 0.35, mentions30d: 0.35, traffic: 0.2, fundingBoost: 0.1 },
    },
  };

  return { romcScore, romcAiScore, confidence, components };
}


