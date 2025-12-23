import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { rateLimitExpensive } from "@/src/lib/ratelimit/expensive";
import { getEntitlement } from "@/src/lib/entitlements";
import { getApiKeyContext } from "@/src/lib/apiKeys/lookup";
import { isFlagEnabled } from "@/src/lib/flags/flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ cui: string }> };

export async function GET(req: Request, ctx: Ctx) {
  // Check feature flag
  const forecastsEnabled = await isFlagEnabled("FORECASTS");
  if (!forecastsEnabled) {
    return NextResponse.json({ ok: false, error: "Forecasts are currently disabled" }, { status: 503 });
  }

  const ent = await getEntitlement();
  const isPremium = ent.ok && ent.isPremium;
  const apiKey = await getApiKeyContext(req);
  const apiPremium = apiKey.ok && (apiKey.plan === "PREMIUM" || apiKey.plan === "PARTNER");
  const rl = await rateLimitExpensive(req, {
    kind: apiKey.ok ? (apiKey.plan === "PREMIUM" || apiKey.plan === "PARTNER" ? "premium" : "auth") : ent.ok ? (isPremium ? "premium" : "auth") : "anon",
    key: apiKey.ok ? `apikey:${apiKey.id}` : ent.ok ? `user:${ent.userId}` : undefined,
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
      romcScore: true,
      romcConfidence: true,
      romcAiScore: true,
      lastScoredAt: true,
    },
  });
  if (!company) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404, headers: rl.headers });

  const forecasts = await prisma.companyForecast.findMany({
    where: { companyId: company.id, modelVersion: "pred-v1" },
    orderBy: { horizonDays: "asc" },
    select: {
      horizonDays: true,
      forecastScore: true,
      forecastConfidence: true,
      forecastBandLow: true,
      forecastBandHigh: true,
      reasoning: true,
      computedAt: true,
    },
  });

  const full = isPremium || apiPremium;
  const filtered = full
    ? forecasts
    : forecasts
        .filter((f) => f.horizonDays === 30)
        .map((f) => ({ ...f, reasoning: null }));

  return NextResponse.json(
    {
      ok: true,
      premium: full,
      company: {
        slug: company.slug,
        name: company.name,
        cui: company.cui,
        romcScore: company.romcScore,
        romcConfidence: company.romcConfidence,
        romcAiScore: company.romcAiScore,
        lastScoredAt: company.lastScoredAt,
      },
      forecasts: filtered,
    },
    { headers: rl.headers },
  );
}


