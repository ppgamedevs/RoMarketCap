import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { requireCsrf } from "@/src/lib/csrf/middleware";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  name: z.string().min(1).max(100),
  cuis: z.array(z.string().min(1)).min(2).max(5),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const csrf = await requireCsrf(req);
  if (!csrf.ok) return NextResponse.json({ ok: false, error: csrf.error }, { status: csrf.status });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  const comparison = await prisma.savedComparison.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      cuis: parsed.data.cuis,
    },
  });

  return NextResponse.json({ ok: true, comparison });
}

