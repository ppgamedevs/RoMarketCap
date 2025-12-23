import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { getLangFromRequest } from "@/src/lib/i18n";
import { renderCompanyReportHtml } from "@/src/lib/report/renderCompanyReport";
import { getEntitlement } from "@/src/lib/entitlements";
import { rateLimitExpensive } from "@/src/lib/ratelimit/expensive";
import { isFlagEnabled } from "@/src/lib/flags/flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ cui: string }> };

export async function GET(req: Request, ctx: Ctx) {
  // Check feature flag
  const apiEnabled = await isFlagEnabled("API_ACCESS");
  if (!apiEnabled) {
    return NextResponse.json({ ok: false, error: "API access is currently disabled" }, { status: 503 });
  }

  const lang = await getLangFromRequest();
  const ent = await getEntitlement();
  if (!ent.ok || !ent.isPremium) return NextResponse.json({ ok: false, error: "Premium required" }, { status: 402 });

  const rl = await rateLimitExpensive(req, {
    kind: ent.isPremium ? "premium" : "auth",
    key: ent.ok ? `user:${ent.userId}` : undefined,
  });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });

  const { cui } = await ctx.params;
  const company = await prisma.company.findUnique({
    where: { cui },
    select: {
      id: true,
      slug: true,
      name: true,
      cui: true,
      county: true,
      city: true,
      website: true,
      romcScore: true,
      romcConfidence: true,
      romcAiScore: true,
      valuationRangeLow: true,
      valuationRangeHigh: true,
      valuationCurrency: true,
      lastScoredAt: true,
      lastEnrichedAt: true,
    },
  });
  if (!company) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const forecasts = await prisma.companyForecast.findMany({
    where: { companyId: company.id, modelVersion: "pred-v1" },
    orderBy: { horizonDays: "asc" },
    select: { horizonDays: true, forecastScore: true, forecastConfidence: true, forecastBandLow: true, forecastBandHigh: true, reasoning: true, computedAt: true },
  });

  const html = renderCompanyReportHtml({
    lang,
    company: {
      ...company,
      valuationRangeLow: company.valuationRangeLow == null ? null : Number(company.valuationRangeLow),
      valuationRangeHigh: company.valuationRangeHigh == null ? null : Number(company.valuationRangeHigh),
    },
    forecasts,
    showReasoning: true,
  });

  const res = new NextResponse(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", ...rl.headers } });
  res.headers.set("Cache-Control", "no-store");
  return res;
}


