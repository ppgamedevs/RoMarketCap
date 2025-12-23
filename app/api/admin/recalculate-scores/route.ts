import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { scoreCompanyV0 } from "@/src/lib/scoring/scoreCompany";
import { Prisma } from "@prisma/client";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { logAdminAction } from "@/src/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  companyId: z.string().uuid().optional(),
  slug: z.string().min(1).optional(),
  all: z.boolean().optional(),
});

function todayUtcDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

async function recalcOne(companyId: string, now: Date) {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) return null;
  const metrics = await prisma.companyMetrics.findUnique({ where: { companyId } });

  const scored = scoreCompanyV0({
    company: { id: company.id, slug: company.slug, name: company.name, website: company.website },
    metrics,
    now,
  });

  const asOfDate = todayUtcDate(now);
  const snapshot = await prisma.companyScoreSnapshot.upsert({
    where: { companyId_asOfDate: { companyId: company.id, asOfDate } },
    update: {
      romcScore: scored.romcScore,
      romcAiScore: scored.romcAiScore,
      confidence: scored.confidence,
      componentsJson: scored.components as Prisma.InputJsonValue,
    },
    create: {
      companyId: company.id,
      asOfDate,
      romcScore: scored.romcScore,
      romcAiScore: scored.romcAiScore,
      confidence: scored.confidence,
      componentsJson: scored.components as Prisma.InputJsonValue,
    },
  });

  return { companyId: company.id, slug: company.slug, snapshot };
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Validation failed" }, { status: 400 });
  }

  const { companyId, slug, all } = parsed.data;
  const now = new Date();

  if (all) {
    const batchSize = 200;
    let cursor: string | undefined = undefined;
    let processed = 0;
    let updated = 0;

    while (true) {
      const args: Prisma.CompanyFindManyArgs = {
        select: { id: true },
        orderBy: { id: "asc" },
        take: batchSize,
      };
      if (cursor) {
        args.cursor = { id: cursor };
        args.skip = 1;
      }

      const companies = await prisma.company.findMany(args);

      if (companies.length === 0) break;
      for (const c of companies) {
        processed += 1;
        const r = await recalcOne(c.id, now);
        if (r) updated += 1;
      }
      cursor = companies[companies.length - 1]!.id;
    }

    await logAdminAction({
      actorUserId: session.user.id,
      action: "score.recompute_v0_all",
      entityType: "CompanyScoreSnapshot",
      entityId: "all",
      metadata: { processed, updated },
    });
    return NextResponse.json({ ok: true, mode: "all", processed, updated });
  }

  let targetId = companyId;
  if (!targetId && slug) {
    const c = await prisma.company.findUnique({ where: { slug } });
    targetId = c?.id;
  }

  if (!targetId) {
    return NextResponse.json({ ok: false, error: "Provide companyId or slug or all=true" }, { status: 400 });
  }

  const result = await recalcOne(targetId, now);
  if (!result) return NextResponse.json({ ok: false, error: "Company not found" }, { status: 404 });

  await logAdminAction({
    actorUserId: session.user.id,
    action: "score.recompute_v0_one",
    entityType: "Company",
    entityId: targetId,
    metadata: { slug: result.slug },
  });

  return NextResponse.json({ ok: true, mode: "one", ...result });
}


