/**
 * Diagnostic endpoint to check how many companies need name updates
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Count companies with placeholder names
    const placeholderCount = await prisma.company.count({
      where: {
        OR: [
          { name: { startsWith: "Companie CUI:" } },
          { name: { startsWith: "Company CUI:" } },
          { name: "" },
        ],
        cui: { not: null },
      },
    });

    // Count companies with null names
    const nullNameCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count
      FROM "companies"
      WHERE name IS NULL
        AND cui IS NOT NULL
    `;

    // Get sample companies with placeholder names
    const samplePlaceholder = await prisma.company.findMany({
      where: {
        OR: [
          { name: { startsWith: "Companie CUI:" } },
          { name: { startsWith: "Company CUI:" } },
          { name: "" },
        ],
        cui: { not: null },
      },
      select: {
        id: true,
        cui: true,
        name: true,
      },
      take: 5,
      orderBy: { createdAt: "desc" },
    });

    // Get sample companies with null names
    const sampleNull = await prisma.$queryRaw<Array<{ id: string; cui: string; name: string | null }>>`
      SELECT id, cui, name
      FROM "companies"
      WHERE name IS NULL
        AND cui IS NOT NULL
      ORDER BY "created_at" DESC
      LIMIT 5
    `;

    // Total companies with CUI
    const totalWithCui = await prisma.company.count({
      where: {
        cui: { not: null },
      },
    });

    return NextResponse.json({
      ok: true,
      summary: {
        totalCompaniesWithCui: totalWithCui,
        placeholderNames: placeholderCount,
        nullNames: Number(nullNameCount[0]?.count || 0),
        totalNeedingUpdate: placeholderCount + Number(nullNameCount[0]?.count || 0),
      },
      samples: {
        placeholder: samplePlaceholder,
        nullNames: sampleNull,
      },
    });
  } catch (error) {
    console.error("[admin/check-companies-needing-name-update] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
