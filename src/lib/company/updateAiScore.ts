import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/db";
import { computeRomcAi } from "@/src/lib/romcAi";
import { smoothScoreCapped, calculateScoreDelta, calculateStabilityProfile } from "@/src/lib/integrity/stability";
import { logCompanyChange } from "@/src/lib/changelog/logChange";
import { CompanyChangeType } from "@prisma/client";

export async function updateCompanyRomcAiById(companyId: string, now = new Date()) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      website: true,
      industrySlug: true,
      countySlug: true,
      employees: true,
      revenueLatest: true,
      profitLatest: true,
      descriptionRo: true,
      lastScoredAt: true,
      romcAiScore: true,
      previousRomcAiScore: true,
    },
  });
  if (!company) return null;

  const [approvedClaimCount, approvedSubmissionCount] = await Promise.all([
    prisma.companyClaim.count({ where: { companyId, status: "APPROVED" } }),
    prisma.companySubmission.count({ where: { companyId, status: "APPROVED" } }),
  ]);

  const out = computeRomcAi({
    website: company.website ?? null,
    industrySlug: company.industrySlug ?? null,
    countySlug: company.countySlug ?? null,
    employees: company.employees ?? null,
    revenueLatest: company.revenueLatest,
    profitLatest: company.profitLatest,
    descriptionRo: company.descriptionRo ?? null,
    lastScoredAt: company.lastScoredAt ?? null,
    approvedClaimCount,
    approvedSubmissionCount,
    now,
  });

  // Apply smoothing with 7% daily cap
  const rawScore = out.score;
  const smoothedScore = smoothScoreCapped(rawScore, company.romcAiScore ?? company.previousRomcAiScore, 7);
  const delta = calculateScoreDelta(smoothedScore, company.romcAiScore ?? company.previousRomcAiScore);

  // Calculate stability profile from recent history
  const recentHistory = await prisma.companyScoreHistory.findMany({
    where: { companyId },
    orderBy: { recordedAt: "desc" },
    take: 7,
    select: { romcScore: true },
  });

  const deltas = [];
  for (let i = 1; i < recentHistory.length; i++) {
    const prev = recentHistory[i - 1].romcScore;
    const curr = recentHistory[i].romcScore;
    deltas.push(curr - prev);
  }
  if (delta != null) deltas.push(delta);
  const stabilityProfile = calculateStabilityProfile(deltas);

  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      previousRomcAiScore: company.romcAiScore,
      romcAiScore: smoothedScore,
      romcAiScoreDelta: delta,
      romcAiComponents: out.components as Prisma.InputJsonValue,
      romcAiUpdatedAt: now,
      scoreStabilityProfile: stabilityProfile,
    },
  });

  // Log score change if significant
  if (delta != null && Math.abs(delta) >= 3) {
    await logCompanyChange({
      companyId,
      changeType: CompanyChangeType.SCORE_CHANGE,
      metadata: {
        scoreType: "romc_ai",
        previousScore: company.romcAiScore,
        newScore: smoothedScore,
        delta,
        stabilityProfile,
      },
    });
  }

  return { company: updated, ai: out };
}


