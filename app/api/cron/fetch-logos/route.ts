/**
 * Cron job to automatically fetch company logos
 * 
 * Runs periodically (daily/weekly) to fetch logos for new companies.
 * Protected by feature flag: FETCH_LOGOS_CRON_ENABLED
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import * as Sentry from "@sentry/nextjs";
import { fetchCompanyLogo, extractDomain } from "@/src/lib/connectors/logos/fetchLogo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

// Cron secret verification
function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // Allow if no secret configured
  
  const header = req.headers.get("x-cron-secret") || 
                 req.headers.get("authorization")?.replace("Bearer ", "");
  return header === secret;
}

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  // Verify cron secret
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  
  try {
    // Check feature flag
    const flagEnabled = await kv.get<boolean>("flag:FETCH_LOGOS_CRON_ENABLED").catch(() => null);
    if (flagEnabled === false) {
      return NextResponse.json({ 
        ok: true, 
        message: "Logo fetching cron disabled via feature flag",
        skipped: true,
      });
    }

    const BATCH_SIZE = 100; // Process up to 100 companies per run
    
    // Query companies that need logos
    const companies = await prisma.company.findMany({
      where: {
        website: { not: null },
        logoUrl: null,
        isPublic: true,
        isSkeleton: false,
      },
      select: {
        id: true,
        name: true,
        website: true,
        cui: true,
      },
      orderBy: { createdAt: "desc" }, // Prioritize newer companies
      take: BATCH_SIZE,
    });

    if (companies.length === 0) {
      console.log("[cron:fetch-logos] No companies need logo fetching");
      return NextResponse.json({
        ok: true,
        message: "No companies need logo fetching",
        processed: 0,
      });
    }

    const results = {
      total: companies.length,
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ name: string; error: string }>,
    };

    console.log(`[cron:fetch-logos] Processing ${companies.length} companies...`);

    // Process each company
    for (const company of companies) {
      try {
        results.processed++;

        if (!company.website) {
          results.skipped++;
          continue;
        }

        // Extract domain from website
        const domain = extractDomain(company.website);
        if (!domain) {
          results.skipped++;
          console.warn(`[cron:fetch-logos] Could not extract domain from ${company.website}`);
          continue;
        }

        // Fetch logo
        const logoUrl = await fetchCompanyLogo(domain);

        if (logoUrl) {
          // Update company with logo URL
          await prisma.company.update({
            where: { id: company.id },
            data: { logoUrl },
          });
          results.success++;
          console.log(`[cron:fetch-logos] ✓ Updated logo for ${company.name}`);
        } else {
          results.failed++;
          console.warn(`[cron:fetch-logos] Could not fetch logo for ${company.name}`);
        }

        // Small delay to respect rate limits
        await new Promise((r) => setTimeout(r, 100));
      } catch (error) {
        results.failed++;
        results.errors.push({
          name: company.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error(`[cron:fetch-logos] Error processing ${company.name}:`, error);
      }
    }

    // Update last sync timestamp
    await kv.set("cron:last:fetch-logos", new Date().toISOString());

    const duration = Date.now() - startTime;
    
    console.log(`[cron:fetch-logos] Completed in ${duration}ms:`, results);

    return NextResponse.json({
      ok: true,
      message: `Fetched logos for ${results.success}/${results.total} companies`,
      duration,
      ...results,
    });
  } catch (error) {
    console.error("[cron:fetch-logos] Fatal error:", error);
    Sentry.captureException(error);
    
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}
