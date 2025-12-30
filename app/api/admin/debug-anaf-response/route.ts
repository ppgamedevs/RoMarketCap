/**
 * Debug endpoint to see what ANAF returns for a sample of companies
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { verifyCompany } from "@/src/lib/connectors/anaf/verifyCompany";
import { verifyCompanyANAF } from "@/src/lib/verification/anaf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const cui = url.searchParams.get("cui");
    const limit = parseInt(url.searchParams.get("limit") || "5", 10);

    if (cui) {
      // Debug a specific CUI
      const normalized = cui.trim();
      const anafResult = await verifyCompany(normalized);
      const rawResult = await verifyCompanyANAF(normalized);

      return NextResponse.json({
        ok: true,
        cui: normalized,
        normalizedResult: anafResult,
        rawResult: {
          verificationStatus: rawResult.verificationStatus,
          isActive: rawResult.isActive,
          isVatRegistered: rawResult.isVatRegistered,
          verifiedAt: rawResult.verifiedAt,
          rawResponse: rawResult.rawResponse,
        },
      });
    }

    // Get sample companies that need name updates
    // Query 1: Companies with generic names
    const companiesWithGenericNames = await prisma.company.findMany({
      where: {
        OR: [
          { name: { startsWith: "Companie CUI:" } },
          { name: { startsWith: "Company " } },
          { name: "" },
        ],
        cui: { not: null },
      },
      select: {
        id: true,
        cui: true,
        name: true,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    // Query 2: Companies with null names (need separate query due to Prisma limitations)
    const companiesWithNullNames = await prisma.company.findMany({
      where: {
        name: null,
        cui: { not: null },
      },
      select: {
        id: true,
        cui: true,
        name: true,
      },
      take: Math.max(0, limit - companiesWithGenericNames.length),
      orderBy: { createdAt: "desc" },
    });

    // Combine results
    const companies = [...companiesWithGenericNames, ...companiesWithNullNames].slice(0, limit);
      select: {
        id: true,
        cui: true,
        name: true,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
    });

    const results = await Promise.allSettled(
      companies.map(async (company) => {
        if (!company.cui) return null;

        const anafResult = await verifyCompany(company.cui);
        const rawResult = await verifyCompanyANAF(company.cui);

        return {
          company: {
            id: company.id,
            cui: company.cui,
            currentName: company.name,
          },
          normalizedResult: anafResult,
          rawResult: {
            verificationStatus: rawResult.verificationStatus,
            isActive: rawResult.isActive,
            isVatRegistered: rawResult.isVatRegistered,
            verifiedAt: rawResult.verifiedAt,
            rawResponse: rawResult.rawResponse,
          },
        };
      })
    );

    const successful = results
      .filter((r) => r.status === "fulfilled" && r.value !== null)
      .map((r) => (r.status === "fulfilled" ? r.value : null));

    const failed = results
      .filter((r) => r.status === "rejected")
      .map((r) => (r.status === "rejected" ? { error: r.reason?.message || String(r.reason) } : null));

    return NextResponse.json({
      ok: true,
      message: `Debugged ${companies.length} companies`,
      sampleSize: companies.length,
      successful: successful.length,
      failed: failed.length,
      results: successful,
      errors: failed,
    });
  } catch (error) {
    console.error("[admin/debug-anaf-response] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

