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
    const force = url.searchParams.get("force") === "1" || url.searchParams.get("force") === "true";

    if (cui) {
      // Debug a specific CUI
      const normalized = cui.trim();
      
      // Check cache first (unless force=true)
      const { getCachedVerification } = await import("@/src/lib/verification/anaf");
      const cached = force ? null : await getCachedVerification(normalized);
      
      // Check rate limit status and clear it if needed for debugging
      const { kv } = await import("@vercel/kv");
      const lastRequest = await kv.get<number>("anaf:last_request").catch(() => null);
      const rateLimitInfo = lastRequest 
        ? { lastRequest: new Date(lastRequest).toISOString(), elapsedMs: Date.now() - lastRequest, canProceed: Date.now() - lastRequest >= 1000 }
        : { lastRequest: null, elapsedMs: null, canProceed: true };
      
      // For debugging: if rate limited, wait and retry up to 3 times
      let rawResult = await verifyCompanyANAF(normalized, { force });
      let retryCount = 0;
      const maxRetries = 3;
      
      while (rawResult.verificationStatus === "PENDING" && rawResult.errorMessage === "Rate limit exceeded" && retryCount < maxRetries) {
        retryCount++;
        // Wait for rate limit to clear (1 second + buffer)
        await new Promise(resolve => setTimeout(resolve, 1200));
        rawResult = await verifyCompanyANAF(normalized, { force });
      }
      
      const anafResult = await verifyCompany(normalized);

      // PROMPT 62: Show endpoint chain info
      const endpoints = [
        "https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva",
        "https://webservicesp.anaf.ro/PlatitorTvaRest/api/v7/ws/tva",
      ];
      if (process.env.ANAF_V9_EXPERIMENTAL === "true") {
        endpoints.push("https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva");
      }

      return NextResponse.json({
        ok: true,
        cui: normalized,
        force,
        endpointChain: endpoints,
        endpointUsed: rawResult.endpointUsed || null,
        note: rawResult.verificationStatus === "ERROR" && rawResult.errorMessage?.includes("404")
          ? "ANAF API endpoint returned 404. The endpoint may be incorrect, changed, or the API may not be available. The current endpoint is for VAT registration status and may not return company names."
          : null,
        cached: cached ? { ...cached, verifiedAt: cached.verifiedAt.toISOString() } : null,
        rateLimitInfo,
        normalizedResult: anafResult,
        rawResult: {
          verificationStatus: rawResult.verificationStatus,
          isActive: rawResult.isActive,
          isVatRegistered: rawResult.isVatRegistered,
          verifiedAt: rawResult.verifiedAt,
          errorMessage: rawResult.errorMessage,
          // PROMPT 62: Show parsed company info
          companyName: rawResult.companyName,
          address: rawResult.address,
          caen: rawResult.caen,
          registrationNumber: rawResult.registrationNumber,
          phone: rawResult.phone,
          iban: rawResult.iban,
          registrationStatus: rawResult.registrationStatus,
          fiscalAuthority: rawResult.fiscalAuthority,
          rawResponse: rawResult.rawResponse,
          // Show all keys in rawResponse if it exists
          rawResponseKeys: rawResult.rawResponse && typeof rawResult.rawResponse === "object" 
            ? Object.keys(rawResult.rawResponse as Record<string, unknown>)
            : null,
          // PROMPT 62: Show request details for debugging
          requestDetails: {
            cui: normalized,
            cuiAsNumber: parseInt(normalized, 10),
            date: new Date().toISOString().split("T")[0],
            requestBody: JSON.stringify([{ cui: parseInt(normalized, 10), data: new Date().toISOString().split("T")[0] }]),
          },
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

    // Query 2: Companies with null names (need raw SQL due to Prisma limitations)
    const nullNameLimit = Math.max(0, limit - companiesWithGenericNames.length);
    const companiesWithNullNames = nullNameLimit > 0
      ? await prisma.$queryRaw<Array<{ id: string; cui: string; name: string | null }>>`
          SELECT id, cui, name
          FROM "Company"
          WHERE name IS NULL
            AND cui IS NOT NULL
          ORDER BY "createdAt" DESC
          LIMIT ${nullNameLimit}
        `
      : [];

    // Combine results
    const companies = [...companiesWithGenericNames, ...companiesWithNullNames].slice(0, limit);

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
            endpointUsed: rawResult.endpointUsed,
            companyName: rawResult.companyName,
            address: rawResult.address,
            caen: rawResult.caen,
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

