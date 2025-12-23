import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { scoreCompanyV0 } from "@/src/lib/scoring/scoreCompany";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireCronSecret(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return { ok: false as const, status: 500, error: "CRON_SECRET not configured" };
  const provided = req.headers.get("x-cron-secret") ?? "";
  if (provided !== expected) return { ok: false as const, status: 401, error: "Unauthorized" };
  return { ok: true as const };
}

function todayUtcDate(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function GET(req: Request) {
  const guard = requireCronSecret(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: guard.status });

  const now = new Date();
  const asOfDate = todayUtcDate(now);

  const batchSize = 200;
  let cursor: string | undefined = undefined;
  let processed = 0;
  let updated = 0;

  while (true) {
    const args: Prisma.CompanyFindManyArgs = {
      select: { id: true, slug: true, name: true, website: true },
      orderBy: { id: "asc" },
      take: batchSize,
    };
    if (cursor) {
      args.cursor = { id: cursor };
      args.skip = 1;
    }

    const companies = await prisma.company.findMany(args);
    if (companies.length === 0) break;

    for (const company of companies) {
      processed += 1;
      const metrics = await prisma.companyMetrics.findUnique({ where: { companyId: company.id } });
      const scored = scoreCompanyV0({ company, metrics, now });

      await prisma.companyScoreSnapshot.upsert({
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
      updated += 1;
    }

    cursor = companies[companies.length - 1]!.id;
  }

  return NextResponse.json({ ok: true, processed, updated });
}


