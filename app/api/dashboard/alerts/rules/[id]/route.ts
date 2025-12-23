import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { z } from "zod";
import { UserAlertMetric, UserAlertOperator, UserAlertScope } from "@prisma/client";
import { requireCsrf } from "@/src/lib/csrf/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const UpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  metric: z.nativeEnum(UserAlertMetric).optional(),
  operator: z.nativeEnum(UserAlertOperator).optional(),
  threshold: z.number().min(0).optional(),
  scope: z.nativeEnum(UserAlertScope).optional(),
  companyId: z.string().uuid().optional().nullable(),
  industrySlug: z.string().optional().nullable(),
  countySlug: z.string().optional().nullable(),
  lookbackDays: z.number().int().min(1).max(90).optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const rule = await prisma.userAlertRule.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!rule) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (rule.userId !== session.user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const fullRule = await prisma.userAlertRule.findUnique({ where: { id } });
  return NextResponse.json({ ok: true, rule: fullRule });
}

export async function PUT(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrf = await requireCsrf(req);
  if (!csrf.ok) return NextResponse.json({ ok: false, error: csrf.error }, { status: csrf.status });

  const { id } = await ctx.params;

  const rule = await prisma.userAlertRule.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!rule) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (rule.userId !== session.user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = UpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  const updated = await prisma.userAlertRule.update({
    where: { id },
    data: {
      name: parsed.data.name,
      metric: parsed.data.metric,
      operator: parsed.data.operator,
      threshold: parsed.data.threshold,
      scope: parsed.data.scope,
      companyId: parsed.data.companyId ?? undefined,
      industrySlug: parsed.data.industrySlug ?? undefined,
      countySlug: parsed.data.countySlug ?? undefined,
      lookbackDays: parsed.data.operator === "PCT_CHANGE" ? (parsed.data.lookbackDays ?? 7) : parsed.data.lookbackDays ?? null,
      active: parsed.data.active,
    },
  });

  return NextResponse.json({ ok: true, rule: updated });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrf = await requireCsrf(req);
  if (!csrf.ok) return NextResponse.json({ ok: false, error: csrf.error }, { status: csrf.status });

  const { id } = await ctx.params;

  const rule = await prisma.userAlertRule.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!rule) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (rule.userId !== session.user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  await prisma.userAlertRule.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
