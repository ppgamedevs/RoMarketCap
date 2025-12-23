import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/db";
import { romcV0 } from "@/src/lib/scoring/romcV0";
import { toFiniteNumber } from "@/src/lib/scoring/normalize";

function dayUtc(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function computeScoreForCompany(companyId: string, now = new Date()) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return null;

  const latestMetric = await prisma.companyMetric.findFirst({
    where: { companyId },
    orderBy: { year: "desc" },
  });

  const signals = await prisma.companyIngestSignal.findMany({
    where: { companyId },
    orderBy: { observedAt: "desc" },
    take: 50,
  });

  const out = romcV0({
    revenue: toFiniteNumber(latestMetric?.revenue),
    profit: toFiniteNumber(latestMetric?.profit),
    employees: latestMetric?.employees ?? null,
    assets: toFiniteNumber(latestMetric?.assets),
    liabilities: toFiniteNumber(latestMetric?.liabilities),
    signals: signals.map((s) => ({ type: s.type, observedAt: s.observedAt })),
    now,
  });

  const computedAt = dayUtc(now);
  const version = "romc_v0";

  const snapshot = await prisma.scoreSnapshot.upsert({
    where: { companyId_computedAt_version: { companyId, computedAt, version } },
    update: {
      romcScore: out.romcScore,
      growthScore: out.growthScore,
      riskScore: out.riskScore,
      liquidityScore: out.liquidityScore,
      confidence: out.confidence,
      explanationRo: out.explanationRo,
      explanationEn: out.explanationEn,
      componentsJson: out.components as Prisma.InputJsonValue,
    },
    create: {
      companyId,
      romcScore: out.romcScore,
      growthScore: out.growthScore,
      riskScore: out.riskScore,
      liquidityScore: out.liquidityScore,
      confidence: out.confidence,
      explanationRo: out.explanationRo,
      explanationEn: out.explanationEn,
      computedAt,
      version,
      componentsJson: out.components as Prisma.InputJsonValue,
    },
  });

  return { company, latestMetric, snapshot };
}


