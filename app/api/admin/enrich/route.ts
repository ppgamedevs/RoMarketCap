import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { enrichCompany } from "@/src/lib/enrichment/enrichCompany";
import { updateCompanyEnrichmentById } from "@/src/lib/company/updateEnrichment";
import type { Prisma } from "@prisma/client";
import { logAdminAction } from "@/src/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    companyId: z.string().uuid().optional(),
    cui: z.string().max(40).optional(),
    slug: z.string().max(120).optional(),
  })
  .refine((x) => x.companyId || x.cui || x.slug, { message: "companyId|cui|slug required" });

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  const ors: Prisma.CompanyWhereInput[] = [];
  if (parsed.data.companyId) ors.push({ id: parsed.data.companyId });
  if (parsed.data.cui) ors.push({ cui: parsed.data.cui });
  if (parsed.data.slug) ors.push({ slug: parsed.data.slug });

  const company = await prisma.company.findFirst({ where: { OR: ors }, select: { id: true, website: true } });
  if (!company) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });

  const out = await enrichCompany({ id: company.id, website: company.website ?? null });
  const saved = await updateCompanyEnrichmentById(company.id, out.patch);

  await logAdminAction({
    actorUserId: session.user.id,
    action: "enrich.single",
    entityType: "Company",
    entityId: company.id,
    metadata: { signalsFoundCount: out.signalsFoundCount, patchKeys: saved.patchKeys },
  });

  return NextResponse.json({
    ok: true,
    signalsFoundCount: out.signalsFoundCount,
    updated: saved.updated,
    patchKeys: saved.patchKeys,
  });
}


