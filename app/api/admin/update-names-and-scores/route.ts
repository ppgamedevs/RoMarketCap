/**
 * Update company names from ANAF and recalculate scores
 * 
 * This endpoint:
 * 1. Finds companies with placeholder names or missing scores
 * 2. Fetches official names from ANAF (with rate limiting)
 * 3. Updates company names
 * 4. Recalculates scores for updated companies
 * 
 * Supports cursor-based pagination for resumable processing
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { verifyCompany } from "@/src/lib/connectors/anaf/verifyCompany";
import { verifyCompanyANAF } from "@/src/lib/verification/anaf";
import { updateCompanyRomcV1ById } from "@/src/lib/company/updateScore";
import { updateCompanyRomcAiById } from "@/src/lib/company/updateAiScore";
import { computeScoreForCompany } from "@/src/lib/scoring/computeScoreForCompany";
import { updateCompanyIntegrity } from "@/src/lib/integrity/updateIntegrity";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 10; // Process in small batches to respect ANAF rate limits (1 req/sec)
const DELAY_BETWEEN_REQUESTS = 1100; // 1.1 seconds between ANAF requests (slightly more than 1 sec)
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay between batches

const CURSOR_KEY = "admin:update-names-scores:cursor";

/**
 * Check if name is a placeholder
 */
function isPlaceholderName(name: string | null): boolean {
  if (!name) return true;
  const trimmed = name.trim();
  if (trimmed.length === 0) return true;
  
  // Check for various placeholder formats
  return (
    trimmed.startsWith("Companie CUI:") ||
    trimmed.startsWith("Company CUI:") ||
    // Also match "Company 29496051" format (starts with "Company " followed by digits)
    /^Company \d+$/.test(trimmed) ||
    trimmed.startsWith("Company ") // Catch-all for "Company " prefix
  );
}

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const dryRun = url.searchParams.get("dry") === "1" || url.searchParams.get("dry") === "true";
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const resetCursor = url.searchParams.get("reset") === "1" || url.searchParams.get("reset") === "true";
    const updateScores = url.searchParams.get("scores") !== "0"; // Default: true

    // Reset cursor if requested
    if (resetCursor) {
      await kv.del(CURSOR_KEY).catch(() => null);
    }

    // Get cursor
    let cursor: string | null = null;
    if (!resetCursor) {
      cursor = await kv.get<string>(CURSOR_KEY).catch(() => null);
    }

    // Find companies that need updates
    // Priority: companies with placeholder names first, then companies without scores
    // Note: Some companies have "Company 29496051" format (without "CUI:")
    // Exclude companies that were recently verified (anafVerifiedAt is set) to prevent overwriting
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const companiesWithPlaceholderNames = await prisma.company.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { startsWith: "Companie CUI:" } },
              { name: { startsWith: "Company CUI:" } },
              { name: { startsWith: "Company " } }, // Also match "Company 29496051" format
              { name: "" },
            ],
          },
          { cui: { not: null } },
          // Only update if not recently verified (anafVerifiedAt is null or very old)
          {
            OR: [
              { anafVerifiedAt: null },
              { anafVerifiedAt: { lt: sevenDaysAgo } }, // Older than 7 days
            ],
          },
        ],
      },
      select: {
        id: true,
        cui: true,
        name: true,
      },
      take: limit,
      orderBy: { createdAt: "desc" },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    // Also get companies with null names (using raw SQL due to Prisma limitations)
    const remainingLimit = Math.max(0, limit - companiesWithPlaceholderNames.length);
    let companiesWithNullNames: Array<{ id: string; cui: string; name: string | null }> = [];
    
    if (remainingLimit > 0) {
      // Build query with optional cursor filter
      if (cursor) {
        companiesWithNullNames = await prisma.$queryRaw<Array<{ id: string; cui: string; name: string | null }>>`
          SELECT id, cui, name
          FROM "companies"
          WHERE (name IS NULL OR name = '')
            AND cui IS NOT NULL
            AND id > ${cursor}
            AND (anaf_verified_at IS NULL OR anaf_verified_at < NOW() - INTERVAL '7 days')
          ORDER BY "created_at" DESC
          LIMIT ${remainingLimit}
        `;
      } else {
        companiesWithNullNames = await prisma.$queryRaw<Array<{ id: string; cui: string; name: string | null }>>`
          SELECT id, cui, name
          FROM "companies"
          WHERE (name IS NULL OR name = '')
            AND cui IS NOT NULL
            AND (anaf_verified_at IS NULL OR anaf_verified_at < NOW() - INTERVAL '7 days')
          ORDER BY "created_at" DESC
          LIMIT ${remainingLimit}
        `;
      }
    }

    // Combine results
    const companies = [...companiesWithPlaceholderNames, ...companiesWithNullNames].slice(0, limit);

    if (companies.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No companies need updates",
        processed: 0,
        namesUpdated: 0,
        scoresUpdated: 0,
        errors: 0,
        cursor: null,
        done: true,
      });
    }

    let processed = 0;
    let namesUpdated = 0;
    let scoresUpdated = 0;
    let errors = 0;
    const errorDetails: string[] = [];
    let lastProcessedId: string | null = null;

    // Process in batches to respect rate limits
    for (let i = 0; i < companies.length; i += BATCH_SIZE) {
      const batch = companies.slice(i, i + BATCH_SIZE);

      // Process sequentially within batch to respect ANAF rate limit (1 req/sec)
      for (const company of batch) {
        if (!company.cui) continue;

        processed++;
        lastProcessedId = company.id;

        try {
          let nameWasUpdated = false;

          // Step 1: Update name from ANAF if needed
          if (isPlaceholderName(company.name)) {
            // Wait before ANAF request to respect rate limit
            if (processed > 1) {
              await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
            }

            // Use verifyCompanyANAF to get full result with address and other fields
            const anafResultInternal = await verifyCompanyANAF(company.cui, { force: false });
            const anafResult = await verifyCompany(company.cui); // For normalized result

            if (anafResult.officialName && anafResult.officialName.trim().length > 0) {
              const currentName = company.name || "";
              if (currentName !== anafResult.officialName) {
                if (!dryRun) {
                  await prisma.company.update({
                    where: { id: company.id },
                    data: {
                      name: anafResult.officialName,
                      legalName: anafResult.officialName,
                      officialName: anafResult.officialName,
                      anafVerifiedAt: anafResult.verifiedAt,
                      vatRegistered: anafResult.vatRegistered ?? undefined,
                      // Also update address if available from internal result
                      ...(anafResultInternal.address ? { address: anafResultInternal.address } : {}),
                    },
                  });
                }
                namesUpdated++;
                nameWasUpdated = true;
                console.log(`[update-names-scores] ${dryRun ? "[DRY] " : ""}Updated CUI ${company.cui}: "${currentName}" -> "${anafResult.officialName}"`);
              }
            } else {
              console.log(`[update-names-scores] No name found in ANAF for CUI ${company.cui} (current: "${company.name || "null"}")`);
            }
          }

          // Step 2: Recalculate scores if name was updated or if updateScores is true
          if (updateScores && (nameWasUpdated || !dryRun)) {
            if (!dryRun) {
              // Recalculate all scores
              await Promise.allSettled([
                updateCompanyRomcV1ById(company.id).catch((error) => {
                  console.error(`[update-names-scores] Failed to update ROMC v1 for ${company.id}:`, error);
                }),
                updateCompanyRomcAiById(company.id).catch((error) => {
                  console.error(`[update-names-scores] Failed to update ROMC AI for ${company.id}:`, error);
                }),
                computeScoreForCompany(company.id).catch((error) => {
                  console.error(`[update-names-scores] Failed to compute score-v0 for ${company.id}:`, error);
                }),
                updateCompanyIntegrity(company.id).catch((error) => {
                  console.error(`[update-names-scores] Failed to update integrity for ${company.id}:`, error);
                }),
              ]);

              scoresUpdated++;
            } else {
              // In dry run, just count
              scoresUpdated++;
            }
          }
        } catch (error) {
          errors++;
          const errorMsg = `CUI ${company.cui}: ${error instanceof Error ? error.message : "Unknown error"}`;
          errorDetails.push(errorMsg);
          console.error(`[update-names-scores] Error processing ${company.cui}:`, error);
        }
      }

      // Delay between batches
      if (i + BATCH_SIZE < companies.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // Save cursor for next run
    if (!dryRun && lastProcessedId) {
      await kv.set(CURSOR_KEY, lastProcessedId, { ex: 60 * 60 * 24 * 7 }).catch(() => null); // 7 days TTL
    }

    const done = companies.length < limit;

    return NextResponse.json({
      ok: true,
      message: dryRun
        ? `[DRY RUN] Would process ${processed} companies, update ${namesUpdated} names, recalculate ${scoresUpdated} scores`
        : `Processed ${processed} companies, updated ${namesUpdated} names, recalculated ${scoresUpdated} scores`,
      processed,
      namesUpdated,
      scoresUpdated,
      errors,
      errorDetails: errorDetails.slice(0, 10), // Return first 10 errors
      cursor: lastProcessedId,
      done,
      dryRun,
    });
  } catch (error) {
    console.error("[admin/update-names-and-scores] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
