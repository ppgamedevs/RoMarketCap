import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { notifyCritical } from "@/src/lib/alerts/critical";
import { acquireLockWithRetry } from "@/src/lib/locks/distributed";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import * as Sentry from "@sentry/nextjs";
import { providerRegistry } from "@/src/lib/providers/registry";
import { storeEnrichmentAsProvenance } from "@/src/lib/providers/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  providerId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
  dry: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("CRON_PROVIDERS_ENRICH", false);
    if (!cronEnabled) {
      return NextResponse.json({ ok: false, error: "Provider enrichment cron is disabled" }, { status: 503 });
    }

    const secret = process.env.CRON_SECRET;
    const got = req.headers.get("x-cron-secret");
    if (!secret || got !== secret) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Check for lock
    const lockId = await acquireLockWithRetry("cron:providers-enrich", { ttl: 1800, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      return await executeEnrich(req);
    } finally {
      await import("@/src/lib/locks/distributed").then(({ releaseLock }) => releaseLock("cron:providers-enrich", lockId));
    }
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({ route: "/api/cron/providers/enrich", message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeEnrich(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  const dryRun = parsed.data.dry === "1" || parsed.data.dry === "true";
  const limit = parsed.data.limit || 10;
  const providerId = parsed.data.providerId;

  // Get active providers
  const activeProviders = await providerRegistry.getActiveProviders();
  const providers = providerId
    ? activeProviders.filter((p) => p.getMetadata().id === providerId)
    : activeProviders;

  if (providers.length === 0) {
    return NextResponse.json({ ok: false, error: "No active providers found" }, { status: 400 });
  }

  let totalProcessed = 0;
  let totalEnriched = 0;
  let totalErrors = 0;
  const results: Array<{ providerId: string; processed: number; enriched: number; errors: number }> = [];

  for (const provider of providers) {
    const metadata = provider.getMetadata();
    let processed = 0;
    let enriched = 0;
    let errors = 0;

    try {
      // Get companies that need enrichment (simplified: just get some companies)
      const companies = await prisma.company.findMany({
        where: {
          isPublic: true,
          visibilityStatus: "PUBLIC",
          cui: { not: null },
        },
        select: { cui: true },
        take: limit,
        orderBy: { lastUpdatedAt: "desc" },
      });

      for (const company of companies) {
        if (!company.cui) continue;

        processed++;
        totalProcessed++;

        try {
          const result = await provider.enrichCompany(company.cui);
          if (result && !dryRun) {
            await storeEnrichmentAsProvenance(result, metadata.id);
            await providerRegistry.recordRequest(metadata.id);
            enriched++;
            totalEnriched++;
          }
        } catch (error) {
          errors++;
          totalErrors++;
          await providerRegistry.recordError(metadata.id, error instanceof Error ? error.message : "Unknown error");
        }
      }
    } catch (error) {
      console.error(`[cron:providers-enrich] Provider ${metadata.id} error:`, error);
      errors++;
      totalErrors++;
    }

    results.push({
      providerId: metadata.id,
      processed,
      enriched,
      errors,
    });
  }

  if (!dryRun) {
    await kv.set("cron:last:providers-enrich", new Date().toISOString(), { ex: 60 * 60 * 24 * 7 }).catch(() => null);
    await kv.set(
      "cron:stats:providers-enrich",
      JSON.stringify({ totalProcessed, totalEnriched, totalErrors, results, ts: new Date().toISOString() }),
      { ex: 60 * 60 * 24 * 7 },
    ).catch(() => null);
  }

  return NextResponse.json({
    ok: true,
    totalProcessed,
    totalEnriched,
    totalErrors,
    results,
    dry: dryRun,
  });
}

