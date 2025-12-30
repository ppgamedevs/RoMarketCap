/**
 * Check a sample company to see its data and score
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

    // Get a sample company
    const company = await prisma.company.findFirst({
      where: {
        isPublic: true,
        visibilityStatus: "PUBLIC",
        isSkeleton: false,
      },
      include: {
        scoreSnapshots: {
          where: { version: "romc_v0" },
          orderBy: { computedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!company) {
      return NextResponse.json({ ok: true, message: "No companies found" });
    }

    return NextResponse.json({
      ok: true,
      company: {
        id: company.id,
        cui: company.cui,
        name: company.name,
        legalName: company.legalName,
        dataConfidence: company.dataConfidence,
        isSkeleton: company.isSkeleton,
        scoreSnapshot: company.scoreSnapshots[0] ? {
          romcScore: company.scoreSnapshots[0].romcScore,
          confidence: company.scoreSnapshots[0].confidence,
          componentsJson: company.scoreSnapshots[0].componentsJson,
        } : null,
      },
    });
  } catch (error) {
    console.error("[admin/check-sample-company] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

