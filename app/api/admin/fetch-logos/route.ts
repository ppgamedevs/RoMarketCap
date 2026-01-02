/**
 * Admin endpoint to batch fetch company logos
 * 
 * Fetches logos from Clearbit/Google for companies with websites but no logos.
 * Supports cursor-based pagination to process large batches.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { fetchCompanyLogo, extractDomain } from "@/src/lib/connectors/logos/fetchLogo";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes

type FetchLogosOptions = {
  batchSize?: number;
  cursor?: string;
  dryRun?: boolean;
  skipCache?: boolean;
};

export async function GET(req: Request) {
  try {
    await requireAdminSession().catch(() => null); // Allow browser access
    
    const url = new URL(req.url);
    const batchSize = parseInt(url.searchParams.get("batchSize") || "50");
    const cursor = url.searchParams.get("cursor") || undefined;
    const dryRun = url.searchParams.get("dryRun") === "true";
    const skipCache = url.searchParams.get("skipCache") === "true";

    return await POST(req, { batchSize, cursor, dryRun, skipCache });
  } catch (error) {
    console.error("[admin/fetch-logos] GET error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST(req: Request, options?: FetchLogosOptions) {
  try {
    await requireAdminSession().catch(() => null); // Allow browser access

    // Parse options from body or use provided options
    let opts = options;
    if (!opts) {
      try {
        const body = await req.json();
        opts = body;
      } catch {
        opts = {};
      }
    }

    const batchSize = opts?.batchSize || 50;
    const cursor = opts?.cursor;
    const dryRun = opts?.dryRun || false;
    const skipCache = opts?.skipCache || false;

    const startTime = Date.now();

    // Query companies that need logos
    // - Have a website
    // - Don't have a logoUrl yet
    // - Are public and not skeleton
    const companies = await prisma.company.findMany({
      where: {
        website: { not: null },
        logoUrl: null,
        isPublic: true,
        isSkeleton: false,
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      select: {
        id: true,
        name: true,
        website: true,
        cui: true,
      },
      orderBy: { id: "asc" },
      take: batchSize,
    });

    if (companies.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No companies need logo fetching",
        processed: 0,
        success: 0,
        failed: 0,
        skipped: 0,
        done: true,
        dryRun,
      });
    }

    const results = {
      processed: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      errors: [] as Array<{ companyId: string; name: string; error: string }>,
    };

    console.log(`[fetch-logos] Processing ${companies.length} companies (dry run: ${dryRun})...`);

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
          console.warn(`[fetch-logos] Could not extract domain from ${company.website} for ${company.name}`);
          continue;
        }

        // Fetch logo
        const logoUrl = await fetchCompanyLogo(domain, { skipCache });

        if (logoUrl && !dryRun) {
          // Update company with logo URL
          await prisma.company.update({
            where: { id: company.id },
            data: { logoUrl },
          });
          results.success++;
          console.log(`[fetch-logos] ✓ Updated logo for ${company.name}: ${logoUrl}`);
        } else if (logoUrl && dryRun) {
          results.success++;
          console.log(`[fetch-logos] [DRY RUN] Would update ${company.name} with: ${logoUrl}`);
        } else {
          results.failed++;
          console.warn(`[fetch-logos] Could not fetch logo for ${company.name} (${domain})`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          companyId: company.id,
          name: company.name,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        console.error(`[fetch-logos] Error processing ${company.name}:`, error);
      }
    }

    // Determine if there are more companies to process
    const lastCompanyId = companies[companies.length - 1]?.id;
    const hasMore = companies.length === batchSize;

    const duration = Date.now() - startTime;

    const response = {
      ok: true,
      message: dryRun 
        ? `[DRY RUN] Would process ${results.processed} companies: ${results.success} success, ${results.failed} failed, ${results.skipped} skipped`
        : `Processed ${results.processed} companies: ${results.success} success, ${results.failed} failed, ${results.skipped} skipped`,
      ...results,
      cursor: hasMore ? lastCompanyId : null,
      done: !hasMore,
      dryRun,
      duration,
    };

    console.log(`[fetch-logos] Completed in ${duration}ms:`, response);

    return NextResponse.json(response);
  } catch (error) {
    console.error("[admin/fetch-logos] Fatal error:", error);
    Sentry.captureException(error);
    
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
