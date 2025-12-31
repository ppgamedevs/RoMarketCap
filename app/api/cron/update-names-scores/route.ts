/**
 * Cron job: Update company names from ANAF and recalculate scores
 * 
 * This cron job:
 * 1. Finds companies with placeholder names or missing scores
 * 2. Fetches official names from ANAF (with rate limiting)
 * 3. Updates company names
 * 4. Recalculates scores for updated companies
 * 
 * Supports cursor-based pagination for resumable processing
 * 
 * GET/POST /api/cron/update-names-scores?limit=50
 * Protected by CRON_SECRET header.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { verifyCompany } from "@/src/lib/connectors/anaf/verifyCompany";
import { verifyCompanyANAF } from "@/src/lib/verification/anaf";
import { updateCompanyRomcV1ById } from "@/src/lib/company/updateScore";
import { updateCompanyRomcAiById } from "@/src/lib/company/updateAiScore";
import { computeScoreForCompany } from "@/src/lib/scoring/computeScoreForCompany";
import { updateCompanyIntegrity } from "@/src/lib/integrity/updateIntegrity";
import { kv } from "@vercel/kv";
import { withLock } from "@/src/lib/locks/distributed";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { notifyCritical } from "@/src/lib/alerts/critical";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BATCH_SIZE = 10; // Process in small batches to respect ANAF rate limits (1 req/sec)
const DELAY_BETWEEN_REQUESTS = 1100; // 1.1 seconds between ANAF requests (slightly more than 1 sec)
const DELAY_BETWEEN_BATCHES = 2000; // 2 seconds delay between batches

const CURSOR_KEY = "cron:update-names-scores:cursor";
const DEFAULT_LIMIT = 50; // Process 50 companies per cron run

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
    // Check feature flag
    const cronEnabled = await isFlagEnabled("UPDATE_NAMES_SCORES_CRON_ENABLED", true);
    if (!cronEnabled) {
      return NextResponse.json({ ok: false, error: "Update names/scores cron is disabled via feature flag" }, { status: 503 });
    }

    const secret = process.env.CRON_SECRET;
    const got = req.headers.get("x-cron-secret");
    if (!secret || got !== secret) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Use distributed lock to prevent concurrent runs
    return await withLock("cron:update-names-scores", async () => {
      return await executeUpdate(req);
    }, { ttl: 3600 }); // 1 hour max runtime
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({ route: "/api/cron/update-names-scores", message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeUpdate(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || String(DEFAULT_LIMIT), 10);
    const updateScores = url.searchParams.get("scores") !== "0"; // Default: true

    // Get cursor from KV
    let cursor: string | null = null;
    cursor = await kv.get<string>(CURSOR_KEY).catch(() => null);

    // Find companies that need updates
    // Priority: companies with placeholder names first, then companies without scores
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
          // This prevents overwriting names that were just updated
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
      // Reset cursor if no more companies to process
      await kv.del(CURSOR_KEY).catch(() => null);
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
                namesUpdated++;
                nameWasUpdated = true;
                console.log(`[cron:update-names-scores] Updated CUI ${company.cui}: "${currentName}" -> "${anafResult.officialName}"`);
              }
            } else {
              console.log(`[cron:update-names-scores] No name found in ANAF for CUI ${company.cui} (current: "${company.name || "null"}")`);
            }
          }

          // Step 2: Recalculate scores if name was updated or if updateScores is true
          if (updateScores && nameWasUpdated) {
            // Recalculate all scores
            await Promise.allSettled([
              updateCompanyRomcV1ById(company.id).catch((error) => {
                console.error(`[cron:update-names-scores] Failed to update ROMC v1 for ${company.id}:`, error);
              }),
              updateCompanyRomcAiById(company.id).catch((error) => {
                console.error(`[cron:update-names-scores] Failed to update ROMC AI for ${company.id}:`, error);
              }),
              computeScoreForCompany(company.id).catch((error) => {
                console.error(`[cron:update-names-scores] Failed to compute score-v0 for ${company.id}:`, error);
              }),
              updateCompanyIntegrity(company.id).catch((error) => {
                console.error(`[cron:update-names-scores] Failed to update integrity for ${company.id}:`, error);
              }),
            ]);

            scoresUpdated++;
          }
        } catch (error) {
          errors++;
          const errorMsg = `CUI ${company.cui}: ${error instanceof Error ? error.message : "Unknown error"}`;
          errorDetails.push(errorMsg);
          console.error(`[cron:update-names-scores] Error processing ${company.cui}:`, error);
        }
      }

      // Delay between batches
      if (i + BATCH_SIZE < companies.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
      }
    }

    // Save cursor for next run
    if (lastProcessedId) {
      await kv.set(CURSOR_KEY, lastProcessedId, { ex: 60 * 60 * 24 * 7 }).catch(() => null); // 7 days TTL
    } else {
      // No more companies, reset cursor
      await kv.del(CURSOR_KEY).catch(() => null);
    }

    const done = companies.length < limit;

    // Update last run timestamp
    await kv.set("cron:last:update-names-scores", new Date().toISOString()).catch(() => null);

    return NextResponse.json({
      ok: true,
      message: `Processed ${processed} companies, updated ${namesUpdated} names, recalculated ${scoresUpdated} scores`,
      processed,
      namesUpdated,
      scoresUpdated,
      errors,
      errorDetails: errorDetails.slice(0, 10), // Return first 10 errors
      cursor: lastProcessedId,
      done,
    });
  } catch (error) {
    console.error("[cron/update-names-scores] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
