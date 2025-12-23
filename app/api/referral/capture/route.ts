import { NextResponse } from "next/server";
import { z } from "zod";
import { kv } from "@vercel/kv";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({ ref: z.string().min(6).max(32) });

function ipFromRequest(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({ ref: url.searchParams.get("ref") ?? "" });
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid" }, { status: 400 });

  const ip = ipFromRequest(req);
  const bucket = new Date().toISOString().slice(0, 13); // hour bucket
  const key = `ref:landing:${bucket}:${ip}`;
  const n = await kv.incr(key).catch(() => 0);
  if (n === 1) await kv.expire(key, 60 * 60).catch(() => null);
  if (n > 20) return NextResponse.json({ ok: true, limited: true });

  const code = parsed.data.ref.toLowerCase();

  // Validate code exists. No PII.
  const owner = await prisma.referralCode.findUnique({ where: { code }, select: { userId: true } });
  if (!owner) return NextResponse.json({ ok: true, applied: false });

  const res = NextResponse.json({ ok: true, applied: true });
  res.cookies.set("romc_ref", code, {
    httpOnly: false,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}


