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

  const items = await prisma.watchlistItem.findMany({
    where: { userId: session.user.id },
    include: {
      company: {
        select: {
          slug: true,
          name: true,
          cui: true,
          romcScore: true,
          romcAiScore: true,
          romcConfidence: true,
          valuationRangeLow: true,
          valuationRangeHigh: true,
        },
      },
    },
    take: 500,
  });

  if (format === "json") {
    const json = JSON.stringify(
      items.map((item) => ({
        slug: item.company.slug,
        name: item.company.name,
        cui: item.company.cui,
        romcScore: item.company.romcScore,
        romcAiScore: item.company.romcAiScore,
        romcConfidence: item.company.romcConfidence,
        valuationRangeLow: item.company.valuationRangeLow ? Number(String(item.company.valuationRangeLow)) : null,
        valuationRangeHigh: item.company.valuationRangeHigh ? Number(String(item.company.valuationRangeHigh)) : null,
      })),
      null,
      2,
    );
    return new NextResponse(json, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="watchlist-${new Date().toISOString().slice(0, 10)}.json"`,
        ...rl.headers,
      },
    });
  }

  // CSV
  const headers = ["slug", "name", "cui", "romcScore", "romcAiScore", "romcConfidence", "valuationRangeLow", "valuationRangeHigh"];
  const rows = items.map((item) =>
    [
      item.company.slug,
      item.company.name,
      item.company.cui ?? "",
      item.company.romcScore ?? "",
      item.company.romcAiScore ?? "",
      item.company.romcConfidence ?? "",
      item.company.valuationRangeLow ? Number(String(item.company.valuationRangeLow)) : "",
      item.company.valuationRangeHigh ? Number(String(item.company.valuationRangeHigh)) : "",
    ].map((v) => (typeof v === "string" && v.includes(",") ? `"${v.replace(/"/g, '""')}"` : String(v))),
  );

  const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="watchlist-${new Date().toISOString().slice(0, 10)}.csv"`,
      ...rl.headers,
    },
  });
}

