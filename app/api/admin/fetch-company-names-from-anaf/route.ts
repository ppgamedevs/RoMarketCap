/**
 * Fetch company names from ANAF for companies that have "Companie CUI:" as name
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { verifyCompany } from "@/src/lib/connectors/anaf/verifyCompany";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 10; // Process in small batches to respect ANAF rate limits
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay between batches

export async function GET() {
  return POST();
}

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const limit = typeof body.limit === "number" ? Math.min(body.limit, 100) : 50;

    // Find companies that need name updates
    const companies = await prisma.company.findMany({
      where: {
        OR: [
          { name: { startsWith: "Companie CUI:" } },
          { name: { startsWith: "Company " } }, // Also handle old English format
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

    if (companies.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No companies need name updates",
        processed: 0,
        updated: 0,
        errors: 0,
      });
    }

    let processed = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Process in batches to respect rate limits
    for (let i = 0; i < companies.length; i += BATCH_SIZE) {
      const batch = companies.slice(i, i + BATCH_SIZE);

      await Promise.allSettled(
        batch.map(async (company) => {
          if (!company.cui) return;

          processed++;
          try {
            // Fetch name from ANAF
            const anafResult = await verifyCompany(company.cui);

            if (anafResult.officialName) {
              // Update company with official name
              await prisma.company.update({
                where: { id: company.id },
                data: {
                  name: anafResult.officialName,
                  legalName: anafResult.officialName,
                  officialName: anafResult.officialName,
                  anafVerifiedAt: anafResult.verifiedAt,
                  vatRegistered: anafResult.vatRegistered ?? undefined,
                },
              });
              updated++;
            } else {
              // ANAF didn't return a name - log but don't count as error
              console.log(`[fetch-names] No name found in ANAF for CUI ${company.cui}`);
            }
          } catch (error) {
            errors++;
            const errorMsg = `CUI ${company.cui}: ${error instanceof Error ? error.message : "Unknown error"}`;
            errorDetails.push(errorMsg);
            console.error(`[fetch-names] Error fetching name for ${company.cui}:`, error);
          }
        })
      );

      // Delay between batches to respect rate limits
      if (i + BATCH_SIZE < companies.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    return NextResponse.json({
      ok: true,
      message: `Processed ${processed} companies, updated ${updated} names`,
      processed,
      updated,
      errors,
      errorDetails: errorDetails.slice(0, 10), // Return first 10 errors
    });
  } catch (error) {
    console.error("[admin/fetch-company-names-from-anaf] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

