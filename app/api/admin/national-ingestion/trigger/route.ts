/**
 * PROMPT 61: Trigger National Ingestion (Admin)
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { shouldBlockMutation } from "@/src/lib/flags/readOnly";
import { executeNationalIngestRun } from "@/src/lib/ingestion/national/run";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Vercel max duration (5 minutes)

// Maximum execution time before returning early (240 seconds = 4 minutes, leaving 60s buffer)
const MAX_EXECUTION_TIME_MS = 240 * 1000;

const RequestSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional().default(50), // Further reduced default for manual triggers
  dry: z.coerce.boolean().optional().default(false), // Coerce string "true"/"false" to boolean
});

export async function POST(req: Request) {
  const startTime = Date.now();
  
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check feature flag
    const adminEnabled = await isFlagEnabled("NATIONAL_INGESTION_ADMIN_ENABLED", false);
    if (!adminEnabled) {
      return NextResponse.json(
        { ok: false, error: "National ingestion admin endpoints are disabled via feature flag" },
        { status: 503 }
      );
    }

    // Check read-only mode (admins bypass read-only mode)
    const block = await shouldBlockMutation(req, true);
    if (block.blocked) {
      return NextResponse.json({ ok: false, error: block.reason }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      // Format Zod errors as a readable string instead of sending the full error object
      const errorMessages = parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return NextResponse.json({ 
        ok: false, 
        error: `Invalid request body: ${errorMessages}`,
      }, { status: 400 });
    }

    const { limit, dry } = parsed.data;

    // Check if we're approaching timeout - if so, reduce limit dynamically
    const elapsed = Date.now() - startTime;
    const remainingTime = MAX_EXECUTION_TIME_MS - elapsed;
    
    // If we have less than 60 seconds remaining, reduce limit significantly
    let effectiveLimit = limit;
    if (remainingTime < 60000 && !dry) {
      effectiveLimit = Math.min(limit, 25); // Process max 25 if time is tight
      console.warn(`[admin/national-ingestion/trigger] Time constraint detected, reducing limit from ${limit} to ${effectiveLimit}`);
    }

    // Execute run with timeout protection
    let result: Awaited<ReturnType<typeof executeNationalIngestRun>>;
    
    try {
      result = await Promise.race([
        executeNationalIngestRun({
          limit: effectiveLimit,
          dryRun: dry,
        }),
        new Promise<Awaited<ReturnType<typeof executeNationalIngestRun>>>((_, reject) => {
          setTimeout(() => {
            reject(new Error("Execution timeout - job may still be processing. Check job status."));
          }, remainingTime - 10000); // Fail 10s before hard timeout
        }),
      ]);
    } catch (error) {
      // If timeout, return error response
      console.error("[admin/national-ingestion/trigger] Timeout or error:", error);
      return NextResponse.json({
        ok: false,
        error: error instanceof Error ? error.message : "Timeout or unknown error",
        warning: "Job may still be processing in the background. Check job status via the stats endpoint.",
      }, { status: 500 });
    }

    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || "Ingestion failed",
          jobId: result.jobId,
          discovered: result.discovered,
          upserted: result.upserted,
          errors: result.errors,
          warning: effectiveLimit < limit ? "Limit was reduced due to time constraints" : undefined,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      dryRun: dry,
      jobId: result.jobId,
      discovered: result.discovered,
      upserted: result.upserted,
      errors: result.errors,
      cursorIn: result.cursorIn,
      cursorOut: result.cursorOut,
      warning: effectiveLimit < limit ? "Limit was reduced due to time constraints" : undefined,
    });
  } catch (error) {
    console.error("[admin/national-ingestion/trigger] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

