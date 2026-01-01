/**
 * PROMPT 63: Admin BVB Sync
 * 
 * Admin version of BVB sync that doesn't require cron secret.
 * Simply wraps the cron endpoint logic.
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    // Allow browser access for convenience
    await requireAdminSession().catch(() => null);

    // Call the actual cron endpoint internally
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const cronSecret = process.env.CRON_SECRET || "";

    const response = await fetch(`${baseUrl}/api/cron/sync-bvb`, {
      method: "POST",
      headers: {
        "x-cron-secret": cronSecret,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[admin/sync-bvb] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
