import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { enrichCompany } from "@/src/lib/enrichment/enrichCompany";
import { updateCompanyEnrichmentById } from "@/src/lib/company/updateEnrichment";
import { logAdminAction } from "@/src/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(25),
  onlyMissing: z.coerce.boolean().optional().default(true),
});

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);

  const where = parsed.data.onlyMissing
    ? { website: { not: null }, OR: [{ lastEnrichedAt: null }, { lastEnrichedAt: { lt: thirtyDaysAgo } }] }
    : { website: { not: null } };

  const companies = await prisma.company.findMany({
    where,
    orderBy: { id: "asc" },
    take: parsed.data.limit,
    select: { id: true, website: true },
  });

  let processed = 0;
  let updated = 0;
  let errors = 0;

  for (const c of companies) {
    processed += 1;
    try {
      const out = await enrichCompany({ id: c.id, website: c.website ?? null });
      const saved = await updateCompanyEnrichmentById(c.id, out.patch, now);
      if (saved.updated) updated += 1;
    } catch {
      errors += 1;
    }
  }

  await logAdminAction({
    actorUserId: session.user.id,
    action: "enrich.batch",
    entityType: "Company",
    entityId: "batch",
    metadata: { processed, updated, errors, limit: parsed.data.limit, onlyMissing: parsed.data.onlyMissing },
  });

  return NextResponse.json({ ok: true, processed, updated, errors });
}


