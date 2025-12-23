import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { rateLimitExpensive } from "@/src/lib/ratelimit/expensive";
import { getEntitlement } from "@/src/lib/entitlements";
import { getApiKeyContext } from "@/src/lib/apiKeys/lookup";
import { normalizeQuery, tokenizeQuery } from "@/src/lib/search/normalize";
import { calculateSearchScore } from "@/src/lib/search/rank";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import type { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  q: z.string().min(1).max(80),
});

export async function GET(req: Request) {
  // Check feature flag
  const apiEnabled = await isFlagEnabled("API_ACCESS");
  if (!apiEnabled) {
    return NextResponse.json({ ok: false, error: "API access is currently disabled" }, { status: 503 });
  }

  const ent = await getEntitlement();
  const apiKey = await getApiKeyContext(req);
  const rl = await rateLimitExpensive(req, {
    kind: apiKey.ok ? (apiKey.plan === "PREMIUM" || apiKey.plan === "PARTNER" ? "premium" : "auth") : ent.ok ? (ent.isPremium ? "premium" : "auth") : "anon",
    key: apiKey.ok ? `apikey:${apiKey.id}` : ent.ok ? `user:${ent.userId}` : undefined,
  });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ q: url.searchParams.get("q") ?? "" });
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400, headers: rl.headers });
  }

  const rawQuery = parsed.data.q;
  const normalizedQuery = normalizeQuery(rawQuery);
  const queryTokens = tokenizeQuery(rawQuery);

  // Build search conditions using Prisma types
  const searchConditions: Prisma.CompanyWhereInput[] = [];

  // Exact match on CUI (highest priority)
  if (/^\d+$/.test(normalizedQuery)) {
    searchConditions.push({ cui: normalizedQuery });
  }

  // Name matches (exact, startsWith, contains)
  searchConditions.push({ name: { equals: rawQuery, mode: "insensitive" } });
  searchConditions.push({ name: { startsWith: rawQuery, mode: "insensitive" } });
  searchConditions.push({ name: { contains: rawQuery, mode: "insensitive" } });

  // Legal name matches
  searchConditions.push({ legalName: { contains: rawQuery, mode: "insensitive" } });

  // Slug matches
  searchConditions.push({ slug: { contains: normalizedQuery, mode: "insensitive" } });

  // CUI contains
  searchConditions.push({ cui: { contains: normalizedQuery, mode: "insensitive" } });

  // Domain matches (if query looks like a domain)
  if (normalizedQuery.includes(".")) {
    searchConditions.push({ domain: { contains: normalizedQuery, mode: "insensitive" } });
    searchConditions.push({ website: { contains: normalizedQuery, mode: "insensitive" } });
  }

  // Fetch candidates
  const candidates = await prisma.company.findMany({
    where: {
      visibilityStatus: "PUBLIC",
      isPublic: true,
      OR: searchConditions,
    },
    select: {
      slug: true,
      name: true,
      cui: true,
      city: true,
      county: true,
      website: true,
      dataConfidence: true,
      lastEnrichedAt: true,
    },
    take: 50, // Fetch more candidates for ranking
  });

  // Rank and sort results
  const ranked = candidates
    .map((company) => ({
      slug: company.slug,
      name: company.name,
      cui: company.cui ?? "",
      city: company.city,
      county: company.county,
      score: calculateSearchScore(
        {
          name: company.name,
          cui: company.cui ?? "",
          slug: company.slug,
          website: company.website,
          dataConfidence: company.dataConfidence,
          lastEnrichedAt: company.lastEnrichedAt,
        },
        normalizedQuery,
        queryTokens,
      ),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10); // Top 10 results

  return NextResponse.json({ ok: true, results: ranked }, { headers: rl.headers });
}


