import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { requireCsrf } from "@/src/lib/csrf/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(req: Request, ctx: Ctx) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrf = await requireCsrf(req);
  if (!csrf.ok) return NextResponse.json({ ok: false, error: csrf.error }, { status: csrf.status });

  const { id } = await ctx.params;

  const comparison = await prisma.savedComparison.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!comparison) return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
  if (comparison.userId !== session.user.id) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  await prisma.savedComparison.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}

