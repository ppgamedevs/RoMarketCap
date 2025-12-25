import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { notifyCritical } from "@/src/lib/alerts/critical";
import { acquireLockWithRetry } from "@/src/lib/locks/distributed";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { shouldBlockMutation } from "@/src/lib/flags/readOnly";
import * as Sentry from "@sentry/nextjs";
import { verifyCompanyANAF } from "@/src/lib/verification/anaf";
import { storeVerification, getCompaniesNeedingVerification } from "@/src/lib/verification/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10), // Very conservative limit
  dry: z.string().optional(),
  cursor: z.string().optional(),
  ttlDays: z.coerce.number().int().min(30).max(365).optional().default(90),
});

// Maximum companies to verify per run (safety limit)
const MAX_VERIFICATIONS_PER_RUN = 50;

export async function POST(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("CRON_VERIFY_ANAF", false);
    if (!cronEnabled) {
      return NextResponse.json({ ok: false, error: "ANAF verification cron is disabled via feature flag" }, { status: 503 });
    }

    // Check read-only mode
    const block = await shouldBlockMutation(req, false);
    if (block.blocked) {
      return NextResponse.json({ ok: false, error: block.reason }, { status: 503 });
    }

    const secret = process.env.CRON_SECRET;
    const got = req.headers.get("x-cron-secret");
    if (!secret || got !== secret) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // Check for lock
    const lockId = await acquireLockWithRetry("cron:verify-anaf", { ttl: 3600, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      return await executeVerify(req);
    } finally {
      await import("@/src/lib/locks/distributed").then(({ releaseLock }) => releaseLock("cron:verify-anaf", lockId));
    }
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({ route: "/api/cron/verify-anaf", message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeVerify(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400 });
  }

  const dryRun = parsed.data.dry === "1" || parsed.data.dry === "true";
  const limit = Math.min(parsed.data.limit || 10, MAX_VERIFICATIONS_PER_RUN);
  const ttlDays = parsed.data.ttlDays || 90;
  const cursorKey = "cron:verify-anaf:cursor";
  const cursor = parsed.data.cursor || ((await kv.get<string>(cursorKey).catch(() => null)) ?? null);

  const companies = await getCompaniesNeedingVerification(limit, cursor, ttlDays);

  if (companies.length === 0) {
    // Clear cursor if no more companies
    await kv.del(cursorKey).catch(() => null);
    return NextResponse.json({
      ok: true,
      processed: 0,
      verified: 0,
      errors: 0,
      dry: dryRun,
      message: "No companies need verification",
    });
  }

  let processed = 0;
  let verified = 0;
  let errors = 0;
  const errorDetails: Array<{ companyId: string; error: string }> = [];

  for (const company of companies) {
    processed++;

    if (!company.cui) {
      errors++;
      errorDetails.push({ companyId: company.id, error: "Missing CUI" });
      continue;
    }

    try {
      const result = await verifyCompanyANAF(company.cui);

      if (!dryRun) {
        await storeVerification(company.id, result);
        
        // Update integrity score and risk flags based on verification
        if (result.verificationStatus === "SUCCESS") {
          verified++;
          await import("@/src/lib/integrity/updateIntegrityWithVerification").then(
            ({ updateIntegrityWithVerification }) => updateIntegrityWithVerification(company.id),
          );
        } else {
          errors++;
          errorDetails.push({
            companyId: company.id,
            error: result.errorMessage || "Verification failed",
          });
        }
      } else {
        // Dry run - just count
        if (result.verificationStatus === "SUCCESS") {
          verified++;
        } else {
          errors++;
        }
      }

      // Rate limiting: wait between requests (conservative)
      if (!dryRun && processed < companies.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // 2 seconds between requests
      }
    } catch (error) {
      errors++;
      errorDetails.push({
        companyId: company.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      console.error(`[verify-anaf] Company ${company.id} error:`, error);
    }
  }

  const nextCursor = companies.length > 0 ? companies[companies.length - 1]!.id : null;

  if (!dryRun) {
    if (nextCursor && companies.length >= limit) {
      await kv.set(cursorKey, nextCursor, { ex: 60 * 60 * 24 * 7 }).catch(() => null);
    } else {
      await kv.del(cursorKey).catch(() => null);
    }
    await kv.set("cron:last:verify-anaf", new Date().toISOString(), { ex: 60 * 60 * 24 * 7 }).catch(() => null);
    await kv.set(
      "cron:stats:verify-anaf",
      JSON.stringify({ processed, verified, errors, ts: new Date().toISOString() }),
      { ex: 60 * 60 * 24 * 7 },
    ).catch(() => null);
  }

  return NextResponse.json({
    ok: true,
    processed,
    verified,
    errors,
    dry: dryRun,
    cursor: nextCursor,
    errorDetails: errorDetails.slice(0, 10), // Limit error details
  });
}

