import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { rateLimit } from "@/src/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ExportType = "recent-companies" | "high-growth-unclaimed" | "funds-accelerators";

/**
 * Generate CSV exports for outreach segments
 */
export async function GET(req: Request) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const rl = await rateLimit(req, { kind: "auth", key: `admin:${session.user.id}` });
  if (!rl.ok) {
    return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get("type") as ExportType | null;

  if (!type || !["recent-companies", "high-growth-unclaimed", "funds-accelerators"].includes(type)) {
    return NextResponse.json({ ok: false, error: "Invalid type" }, { status: 400, headers: rl.headers });
  }

  try {
    let csv = "";
    let filename = "";

    if (type === "recent-companies") {
      // Recently added companies (last 30 days)
      const companies = await prisma.company.findMany({
        where: {
          isPublic: true,
          visibilityStatus: "PUBLIC",
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        select: {
          name: true,
          cui: true,
          slug: true,
          industry: true,
          county: true,
          website: true,
          email: true,
          romcScore: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 1000,
      });

      csv = "Name,CUI,Slug,Industry,County,Website,Email,ROMC Score,Created At\n";
      csv += companies
        .map(
          (c) =>
            `"${c.name}","${c.cui ?? ""}","${c.slug}","${c.industry ?? ""}","${c.county ?? ""}","${c.website ?? ""}","${c.email ?? ""}","${c.romcScore ?? ""}","${c.createdAt.toISOString()}"`,
        )
        .join("\n");
      filename = `recent-companies-${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === "high-growth-unclaimed") {
      // High growth but unclaimed companies
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const companies = await prisma.company.findMany({
        where: {
          isPublic: true,
          visibilityStatus: "PUBLIC",
          romcScore: { gte: 60 },
          lastScoredAt: { gte: thirtyDaysAgo },
          claims: { none: { status: { in: ["APPROVED", "PENDING"] } } },
        },
        select: {
          name: true,
          cui: true,
          slug: true,
          industry: true,
          county: true,
          website: true,
          email: true,
          romcScore: true,
          romcAiScore: true,
          lastScoredAt: true,
        },
        orderBy: [{ romcScore: "desc" }],
        take: 500,
      });

      csv = "Name,CUI,Slug,Industry,County,Website,Email,ROMC Score,ROMC AI Score,Last Scored\n";
      csv += companies
        .map(
          (c) =>
            `"${c.name}","${c.cui ?? ""}","${c.slug}","${c.industry ?? ""}","${c.county ?? ""}","${c.website ?? ""}","${c.email ?? ""}","${c.romcScore ?? ""}","${c.romcAiScore ?? ""}","${c.lastScoredAt?.toISOString() ?? ""}"`,
        )
        .join("\n");
      filename = `high-growth-unclaimed-${new Date().toISOString().slice(0, 10)}.csv`;
    } else if (type === "funds-accelerators") {
      // Funds and accelerators (companies with specific industry keywords or high scores)
      const keywords = ["invest", "fund", "capital", "venture", "accelerator", "incubator"];
      const companies = await prisma.company.findMany({
        where: {
          isPublic: true,
          visibilityStatus: "PUBLIC",
          OR: [
            { name: { contains: keywords[0], mode: "insensitive" } },
            { name: { contains: keywords[1], mode: "insensitive" } },
            { name: { contains: keywords[2], mode: "insensitive" } },
            { name: { contains: keywords[3], mode: "insensitive" } },
            { name: { contains: keywords[4], mode: "insensitive" } },
            { name: { contains: keywords[5], mode: "insensitive" } },
            { industrySlug: { in: ["fintech", "investment", "venture-capital"] } },
          ],
        },
        select: {
          name: true,
          cui: true,
          slug: true,
          industry: true,
          county: true,
          website: true,
          email: true,
          romcScore: true,
        },
        orderBy: [{ romcScore: "desc" }],
        take: 500,
      });

      csv = "Name,CUI,Slug,Industry,County,Website,Email,ROMC Score\n";
      csv += companies
        .map(
          (c) =>
            `"${c.name}","${c.cui ?? ""}","${c.slug}","${c.industry ?? ""}","${c.county ?? ""}","${c.website ?? ""}","${c.email ?? ""}","${c.romcScore ?? ""}"`,
        )
        .join("\n");
      filename = `funds-accelerators-${new Date().toISOString().slice(0, 10)}.csv`;
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        ...rl.headers,
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[outreach-export] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500, headers: rl.headers });
  }
}

