import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/db";
import { computeROMC } from "@/src/lib/romcScore";
import { toFiniteNumber } from "@/src/lib/scoring/normalize";
import { logCompanyChange } from "@/src/lib/changelog/logChange";
import { CompanyChangeType } from "@prisma/client";

export async function updateCompanyRomcV1ById(companyId: string, now = new Date()) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return null;

  const metricsCount = await prisma.companyMetric.count({ where: { companyId } });

  const out = computeROMC(
    {
      website: company.website,
      foundedYear: company.foundedYear,
      employees: company.employees ?? company.employeeCountEstimate,
      revenueLatest: company.revenueLatest,
      profitLatest: company.profitLatest,
      description: company.descriptionRo ?? "",
      county: company.county,
      city: company.city,
      metricsCount,
    },
    now,
  );

  const oldScore = company.romcScore;
  const updated = await prisma.company.update({
    where: { id: companyId },
    data: {
      romcScore: out.score,
      romcConfidence: out.confidence,
      romcComponents: out.components as Prisma.InputJsonValue,
      valuationRangeLow: out.valuationRangeLow != null ? new Prisma.Decimal(out.valuationRangeLow) : null,
      valuationRangeHigh: out.valuationRangeHigh != null ? new Prisma.Decimal(out.valuationRangeHigh) : null,
      valuationCurrency: out.valuationCurrency,
      lastScoredAt: now,
      // Keep denormalized employees/revenue/profit coherent if employeeCountEstimate is used elsewhere.
      employees: company.employees ?? company.employeeCountEstimate ?? null,
      revenueLatest: toFiniteNumber(company.revenueLatest) != null ? company.revenueLatest : null,
      profitLatest: toFiniteNumber(company.profitLatest) != null ? company.profitLatest : null,
    },
  });

  // Log score change if significant
  if (oldScore != null && Math.abs(out.score - oldScore) >= 1) {
    await logCompanyChange({
      companyId,
      changeType: CompanyChangeType.SCORE_CHANGE,
      metadata: {
        oldScore,
        newScore: out.score,
        delta: out.score - oldScore,
      },
    });
  }

  return { company: updated, romc: out };
}


