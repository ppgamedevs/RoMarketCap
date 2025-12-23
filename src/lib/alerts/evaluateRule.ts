import type { UserAlertRule } from "@prisma/client";
import { prisma } from "@/src/lib/db";

type CompanyData = {
  romcAiScore: number | null;
  valuationRangeLow: number | null;
  valuationRangeHigh: number | null;
  riskScore?: number | null;
  companyIntegrityScore?: number | null;
};

/**
 * Evaluate alert rule for a company.
 * For PCT_CHANGE operator, requires historical data lookup.
 */
export async function evaluateAlertRule(rule: UserAlertRule, company: CompanyData, companyId: string): Promise<boolean> {
  if (!rule.active) return false;

  let value: number | null = null;

  switch (rule.metric) {
    case "ROMC_AI":
      value = company.romcAiScore;
      break;
    case "VALUATION":
      // Use midpoint of valuation range
      if (company.valuationRangeLow != null && company.valuationRangeHigh != null) {
        value = (company.valuationRangeLow + company.valuationRangeHigh) / 2;
      }
      break;
    case "RISK":
      // Use integrity score as risk metric (inverted: lower integrity = higher risk)
      value = company.companyIntegrityScore != null ? 100 - company.companyIntegrityScore : null;
      break;
  }

  if (value == null) return false;

  switch (rule.operator) {
    case "GT":
      return value > rule.threshold;
    case "LT":
      return value < rule.threshold;
    case "PCT_CHANGE": {
      // PCT_CHANGE requires historical baseline
      const lookbackDays = rule.lookbackDays ?? 7;
      const lookbackDate = new Date();
      lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

      // Find baseline from CompanyScoreHistory
      const baselineHistory = await prisma.companyScoreHistory.findFirst({
        where: {
          companyId,
          recordedAt: { lte: lookbackDate },
        },
        orderBy: { recordedAt: "desc" },
        select: { romcScore: true, valuationRangeLow: true, valuationRangeHigh: true },
      });

      if (!baselineHistory) return false; // No baseline found

      let baseline: number | null = null;

      switch (rule.metric) {
        case "ROMC_AI":
          // For ROMC_AI, use romcScore from history as proxy (AI score history not stored separately)
          // In the future, we could add romcAiScore to CompanyScoreHistory
          baseline = baselineHistory.romcScore ?? null;
          break;
        case "VALUATION":
          if (baselineHistory.valuationRangeLow != null && baselineHistory.valuationRangeHigh != null) {
            baseline = (baselineHistory.valuationRangeLow + baselineHistory.valuationRangeHigh) / 2;
          }
          break;
        case "RISK":
          // Risk baseline would need integrity score history, simplified for now
          // Use romcScore as proxy (lower score = higher risk)
          baseline = baselineHistory.romcScore != null ? 100 - baselineHistory.romcScore : null;
          break;
      }

      if (baseline == null) return false;

      // Percent change formula: (current - baseline) / max(1, abs(baseline)) * 100
      const pctChange = ((value - baseline) / Math.max(1, Math.abs(baseline))) * 100;

      // Threshold is absolute percent value
      return Math.abs(pctChange) >= Math.abs(rule.threshold);
    }
    default:
      return false;
  }
}

/**
 * Synchronous version for simple operators (GT, LT) that don't need historical data.
 * Used when baseline lookup is not needed.
 */
export function evaluateAlertRuleSync(rule: UserAlertRule, company: CompanyData): boolean {
  if (!rule.active) return false;
  if (rule.operator === "PCT_CHANGE") return false; // Requires async lookup

  let value: number | null = null;

  switch (rule.metric) {
    case "ROMC_AI":
      value = company.romcAiScore;
      break;
    case "VALUATION":
      if (company.valuationRangeLow != null && company.valuationRangeHigh != null) {
        value = (company.valuationRangeLow + company.valuationRangeHigh) / 2;
      }
      break;
    case "RISK":
      value = company.companyIntegrityScore != null ? 100 - company.companyIntegrityScore : null;
      break;
  }

  if (value == null) return false;

  switch (rule.operator) {
    case "GT":
      return value > rule.threshold;
    case "LT":
      return value < rule.threshold;
    default:
      return false;
  }
}
