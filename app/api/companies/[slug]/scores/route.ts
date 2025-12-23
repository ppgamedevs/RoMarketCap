import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { slug } = await ctx.params;
  const company = await prisma.company.findUnique({ where: { slug }, select: { id: true } });
  if (!company) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const history = await prisma.scoreSnapshot.findMany({
    where: { companyId: company.id, version: "romc_v0" },
    orderBy: { computedAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    ok: true,
    latest: history[0] ?? null,
    history,
  });
}


