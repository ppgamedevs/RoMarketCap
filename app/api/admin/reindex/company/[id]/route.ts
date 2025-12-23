import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { updateCompanyRomcV1ById } from "@/src/lib/company/updateScore";
import { updateCompanyRomcAiById } from "@/src/lib/company/updateAiScore";
import { updateCompanyIntegrity } from "@/src/lib/integrity/updateIntegrity";
import { prisma } from "@/src/lib/db";
import { computePredV1 } from "@/src/lib/predictions/predV1";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function upsertForecasts(companyId: string, now: Date) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      romcScore: true,
      romcConfidence: true,
      revenueLatest: true,
      profitLatest: true,
      employees: true,
      industrySlug: true,
      countySlug: true,
      lastScoredAt: true,
    },
  });

  if (!company) return;

  const history = await prisma.companyScoreHistory.findMany({
    where: { companyId },
    orderBy: { recordedAt: "desc" },
    take: 6,
    select: { recordedAt: true, romcScore: true },
  });

  const forecasts = computePredV1({
    romcScore: company.romcScore ?? 50,
    romcConfidence: company.romcConfidence ?? 50,
    revenueLatest: company.revenueLatest ? Number(String(company.revenueLatest)) : null,
    profitLatest: company.profitLatest ? Number(String(company.profitLatest)) : null,
    employees: company.employees ?? null,
    industrySlug: company.industrySlug,
    countySlug: company.countySlug,
    lastScoredAt: company.lastScoredAt,
    history: history.map((h) => ({ recordedAt: h.recordedAt, romcScore: h.romcScore })),
  });

  for (const forecast of forecasts) {

    await prisma.companyForecast.upsert({
      where: {
        companyId_horizonDays_modelVersion: {
          companyId,
          horizonDays: forecast.horizonDays,
          modelVersion: forecast.modelVersion,
        },
      },
      update: {
        forecastScore: forecast.forecastScore,
        forecastConfidence: forecast.forecastConfidence,
        forecastBandLow: forecast.forecastBandLow,
        forecastBandHigh: forecast.forecastBandHigh,
        reasoning: forecast.reasoning as Prisma.InputJsonValue,
        computedAt: now,
      },
      create: {
        companyId,
        horizonDays: forecast.horizonDays,
        modelVersion: forecast.modelVersion,
        forecastScore: forecast.forecastScore,
        forecastConfidence: forecast.forecastConfidence,
        forecastBandLow: forecast.forecastBandLow,
        forecastBandHigh: forecast.forecastBandHigh,
        reasoning: forecast.reasoning as Prisma.InputJsonValue,
        computedAt: now,
      },
    });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const now = new Date();

  try {
    // Update ROMC v1
    const romcResult = await updateCompanyRomcV1ById(id, now);

    // Update ROMC AI
    const aiResult = await updateCompanyRomcAiById(id, now);

    // Update forecasts
    await upsertForecasts(id, now);

    // Update integrity
    await updateCompanyIntegrity(id);

    return NextResponse.json({
      ok: true,
      companyId: id,
      romcScore: romcResult?.company.romcScore,
      romcAiScore: aiResult?.company.romcAiScore,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

