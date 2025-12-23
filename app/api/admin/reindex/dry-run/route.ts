import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const scope = body.scope ?? "all"; // "all" | "industry:slug" | "county:slug"
  const limit = Math.min(100, body.limit ?? 50);

  const where: { isPublic: boolean; visibilityStatus: "PUBLIC"; industrySlug?: string; countySlug?: string } = {
    isPublic: true,
    visibilityStatus: "PUBLIC",
  };
  if (scope.startsWith("industry:")) {
    where.industrySlug = scope.split(":")[1];
  } else if (scope.startsWith("county:")) {
    where.countySlug = scope.split(":")[1];
  }

  const companies = await prisma.company.findMany({
    where,
    select: { id: true, slug: true, name: true },
    take: limit,
  });

  // Check KV cursor state
  const cursorKey = `cron:recalculate:cursor:${scope}`;
  const cursor = await kv.get<string>(cursorKey).catch(() => null);

  return NextResponse.json({
    ok: true,
    dryRun: true,
    scope,
    companiesFound: companies.length,
    cursor: cursor ?? null,
    sample: companies.slice(0, 5).map((c) => ({ id: c.id, slug: c.slug, name: c.name })),
  });
}

