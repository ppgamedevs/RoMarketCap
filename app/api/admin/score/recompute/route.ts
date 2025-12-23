import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { updateCompanyRomcV1ById } from "@/src/lib/company/updateScore";
import { logAdminAction } from "@/src/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  companyId: z.string().uuid().optional(),
  slug: z.string().min(1).optional(),
  all: z.boolean().optional(),
});

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Validation failed" }, { status: 400 });

  const { companyId, slug, all } = parsed.data;

  if (all) {
    const batchSize = 200;
    let cursor: string | undefined = undefined;
    let processed = 0;
    let updated = 0;

    while (true) {
      const args: Parameters<typeof prisma.company.findMany>[0] = {
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
        const r = await updateCompanyRomcV1ById(c.id);
        if (r) updated += 1;
      }
      cursor = companies[companies.length - 1]!.id;
    }

    await logAdminAction({
      actorUserId: session.user.id,
      action: "score.recompute_v1_all",
      entityType: "Company",
      entityId: "all",
      metadata: { processed, updated },
    });
    return NextResponse.json({ ok: true, mode: "all", processed, updated });
  }

  let id = companyId;
  if (!id && slug) {
    const c = await prisma.company.findUnique({ where: { slug }, select: { id: true } });
    id = c?.id;
  }
  if (!id) return NextResponse.json({ ok: false, error: "Provide companyId or slug or all=true" }, { status: 400 });

  const result = await updateCompanyRomcV1ById(id);
  if (!result) return NextResponse.json({ ok: false, error: "Company not found" }, { status: 404 });

  await logAdminAction({
    actorUserId: session.user.id,
    action: "score.recompute_v1_one",
    entityType: "Company",
    entityId: id,
    metadata: { slug: result.company.slug },
  });

  return NextResponse.json({ ok: true, mode: "one", companyId: id, slug: result.company.slug, romc: result.romc });
}


