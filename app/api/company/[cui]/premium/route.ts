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
  const paywallsEnabled = await isFlagEnabled("PREMIUM_PAYWALLS");
  if (!paywallsEnabled) {
    return NextResponse.json({ ok: false, error: "Premium paywalls are currently disabled" }, { status: 503 });
  }

  const ent = await getEntitlement();
  const apiKey = await getApiKeyContext(req);
  const apiPremium = apiKey.ok && (apiKey.plan === "PREMIUM" || apiKey.plan === "PARTNER");
  const rl = await rateLimitExpensive(req, {
    kind: apiKey.ok ? (apiKey.plan === "PREMIUM" || apiKey.plan === "PARTNER" ? "premium" : "auth") : ent.ok ? (ent.isPremium ? "premium" : "auth") : "anon",
    key: apiKey.ok ? `apikey:${apiKey.id}` : ent.ok ? `user:${ent.userId}` : undefined,
  });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });
  if (!ent.ok && !apiPremium) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized", upgradeUrl: "/login" },
      { status: 401, headers: rl.headers },
    );
  }
  if (!ent.isPremium && !apiPremium) {
    return NextResponse.json(
      { ok: false, error: "Payment required", upgradeUrl: "/billing" },
      { status: 402, headers: rl.headers },
    );
  }

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
      romcComponents: true,
      valuationRangeLow: true,
      valuationRangeHigh: true,
      valuationCurrency: true,
      lastScoredAt: true,
    },
  });
  if (!company) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404, headers: rl.headers });

  return NextResponse.json(
    {
      ok: true,
      company,
      premium: {
        note: "Premium payload (v1) based on DB-backed computed fields.",
      },
    },
    { headers: rl.headers },
  );
}


