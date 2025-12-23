import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { requireCsrf } from "@/src/lib/csrf/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({ companyId: z.string().uuid() });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrf = await requireCsrf(req);
  if (!csrf.ok) return NextResponse.json({ ok: false, error: csrf.error }, { status: csrf.status });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  const existing = await prisma.watchlistItem.findUnique({
    where: { userId_companyId: { userId: session.user.id, companyId: parsed.data.companyId } },
    select: { id: true },
  });

  if (existing) {
    await prisma.watchlistItem.delete({ where: { userId_companyId: { userId: session.user.id, companyId: parsed.data.companyId } } });
    return NextResponse.json({ ok: true, watched: false });
  }

  await prisma.watchlistItem.create({ data: { userId: session.user.id, companyId: parsed.data.companyId } });
  return NextResponse.json({ ok: true, watched: true });
}


