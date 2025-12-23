import { prisma } from "@/src/lib/db";
import { detectAbuseSignals, calculateIntegrityScore, signalsToRiskFlags } from "./abuse";
import { calculateDataConfidence } from "./confidence";

/**
 * Update integrity and confidence scores for a company.
 * Should be called periodically (e.g., in cron or after significant events).
 */
export async function updateCompanyIntegrity(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      revenueLatest: true,
      profitLatest: true,
      employees: true,
      website: true,
      descriptionRo: true,
      enrichVersion: true,
      lastEnrichedAt: true,
      lastScoredAt: true,
      companyRiskFlags: true,
    },
  });

  if (!company) return null;

  const signals = await detectAbuseSignals(companyId);
  const newFlags = signalsToRiskFlags(signals);
  const integrityScore = calculateIntegrityScore(signals, company.companyRiskFlags);
  const dataConfidence = await calculateDataConfidence(company);

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      companyIntegrityScore: integrityScore,
      dataConfidence,
      companyRiskFlags: newFlags,
    },
  });

  return updated;
}

