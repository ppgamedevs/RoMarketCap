import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { getEntitlement } from "@/src/lib/entitlements";
import { rateLimit } from "@/src/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const ent = await getEntitlement();
  if (!ent.ok || !ent.isPremium) {
    return NextResponse.json({ ok: false, error: "Premium required" }, { status: 403 });
  }

  const rl = await rateLimit(req, {
    kind: "premium",
    key: `user:${session.user.id}`,
  });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") || "csv";

  const comparisons = await prisma.savedComparison.findMany({
    where: { userId: session.user.id },
    take: 100,
  });

  if (format === "json") {
    const json = JSON.stringify(
      comparisons.map((comp) => ({
        id: comp.id,
        name: comp.name,
        cuis: Array.isArray(comp.cuis) ? comp.cuis.filter((c): c is string => typeof c === "string") : [],
        createdAt: comp.createdAt.toISOString(),
        updatedAt: comp.updatedAt.toISOString(),
      })),
      null,
      2,
    );
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="comparisons-${new Date().toISOString().slice(0, 10)}.json"`,
        ...rl.headers,
      },
    });
  }

  // CSV
  const headers = ["id", "name", "cuis", "createdAt", "updatedAt"];
  const rows = comparisons.map((comp) => {
    const cuis = Array.isArray(comp.cuis) ? comp.cuis.filter((c): c is string => typeof c === "string").join(";") : "";
    return [
      comp.id,
      comp.name,
      cuis,
      comp.createdAt.toISOString(),
      comp.updatedAt.toISOString(),
    ].map((v) => (typeof v === "string" && v.includes(",") ? `"${v.replace(/"/g, '""')}"` : String(v)));
  });

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="comparisons-${new Date().toISOString().slice(0, 10)}.csv"`,
      ...rl.headers,
    },
  });
}

