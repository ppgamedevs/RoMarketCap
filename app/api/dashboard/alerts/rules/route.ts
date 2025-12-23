import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { UserAlertMetric, UserAlertOperator, UserAlertScope } from "@prisma/client";
import { requireCsrf } from "@/src/lib/csrf/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  name: z.string().min(1).max(100),
  metric: z.nativeEnum(UserAlertMetric),
  operator: z.nativeEnum(UserAlertOperator),
  threshold: z.number().min(0),
  scope: z.nativeEnum(UserAlertScope),
  companyId: z.string().uuid().optional(),
  industrySlug: z.string().optional(),
  countySlug: z.string().optional(),
  lookbackDays: z.number().int().min(1).max(90).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrf = await requireCsrf(req);
  if (!csrf.ok) return NextResponse.json({ ok: false, error: csrf.error }, { status: csrf.status });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  // Validate scope-specific fields
  if (parsed.data.scope === "COMPANY" && !parsed.data.companyId) {
    return NextResponse.json({ ok: false, error: "companyId required for COMPANY scope" }, { status: 400 });
  }
  if (parsed.data.scope === "INDUSTRY" && !parsed.data.industrySlug) {
    return NextResponse.json({ ok: false, error: "industrySlug required for INDUSTRY scope" }, { status: 400 });
  }
  if (parsed.data.scope === "COUNTY" && !parsed.data.countySlug) {
    return NextResponse.json({ ok: false, error: "countySlug required for COUNTY scope" }, { status: 400 });
  }

  const rule = await prisma.userAlertRule.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      metric: parsed.data.metric,
      operator: parsed.data.operator,
      threshold: parsed.data.threshold,
      scope: parsed.data.scope,
      companyId: parsed.data.companyId ?? null,
      industrySlug: parsed.data.industrySlug ?? null,
      countySlug: parsed.data.countySlug ?? null,
      lookbackDays: parsed.data.operator === "PCT_CHANGE" ? (parsed.data.lookbackDays ?? 7) : null,
      active: true,
    },
  });

  return NextResponse.json({ ok: true, rule });
}

