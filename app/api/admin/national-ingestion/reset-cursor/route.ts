/**
 * PROMPT 61: Reset Cursor (Admin)
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { shouldBlockMutation } from "@/src/lib/flags/readOnly";
import { resetCursor } from "@/src/lib/ingestion/national/checkpoint";

export const dynamic = "force-dynamic";

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

    // Reset cursor
    await resetCursor();

    return NextResponse.json({
      ok: true,
      message: "Cursor reset successfully",
    });
  } catch (error) {
    console.error("[admin/national-ingestion/reset-cursor] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

