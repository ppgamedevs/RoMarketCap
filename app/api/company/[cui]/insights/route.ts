import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { rateLimit } from "@/src/lib/ratelimit";
import { getEntitlement } from "@/src/lib/entitlements";
import { getApiKeyContext } from "@/src/lib/apiKeys/lookup";
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

  const ent = await getEntitlement();
  const apiKey = await getApiKeyContext(req);
  const rl = await rateLimit(req, {
    kind: apiKey.ok ? apiKey.rateLimitKind : ent.ok ? (ent.isPremium ? "premium" : "auth") : "anon",
    key: apiKey.ok ? `apikey:${apiKey.id}` : ent.ok ? `user:${ent.userId}` : undefined,
  });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });

  const { cui } = await ctx.params;
  const company = await prisma.company.findUnique({
    where: { cui },
    select: { id: true, slug: true, name: true, cui: true, city: true, county: true, website: true },
  });
  if (!company) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404, headers: rl.headers });

  const latestScore = await prisma.scoreSnapshot.findFirst({
    where: { companyId: company.id, version: "romc_v0" },
    orderBy: { computedAt: "desc" },
    select: { romcScore: true, confidence: true, computedAt: true },
  });

  return NextResponse.json(
    {
      ok: true,
      company,
      score: latestScore,
      disclaimer: "Estimates. Informational only. Not financial advice.",
    },
    { headers: rl.headers },
  );
}


