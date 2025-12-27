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

const RequestSchema = z.object({
  limit: z.coerce.number().int().min(1).max(1000).optional().default(500),
  dry: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
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

    // Check read-only mode
    const block = await shouldBlockMutation(req, false);
    if (block.blocked) {
      return NextResponse.json({ ok: false, error: block.reason }, { status: 503 });
    }

    const body = await req.json().catch(() => ({}));
    const parsed = RequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid request body", details: parsed.error }, { status: 400 });
    }

    const { limit, dry } = parsed.data;

    // Execute run
    const result = await executeNationalIngestRun({
      limit,
      dryRun: dry,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          ok: false,
          error: result.error || "Ingestion failed",
          jobId: result.jobId,
          discovered: result.discovered,
          upserted: result.upserted,
          errors: result.errors,
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
    });
  } catch (error) {
    console.error("[admin/national-ingestion/trigger] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

