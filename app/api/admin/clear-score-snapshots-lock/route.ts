/**
 * Admin endpoint to clear the score snapshots lock
 * 
 * Use this if the lock is stuck and preventing new snapshots
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const lockKey = "lock:cron:score-snapshots";
    
    // Check if lock exists first
    let lockExists = false;
    let lockValue: string | null = null;
    try {
      lockValue = await kv.get<string>(lockKey);
      lockExists = lockValue !== null;
    } catch (error: any) {
      if (!error?.message?.includes("max requests limit exceeded")) {
        console.warn("[admin/clear-score-snapshots-lock] Error checking lock:", error);
      }
    }
    
    // Try to delete the lock
    try {
      await kv.del(lockKey);
      
      // Verify it was deleted
      const verifyValue = await kv.get<string>(lockKey).catch(() => null);
      const wasDeleted = verifyValue === null;
      
      return NextResponse.json({
        ok: true,
        message: wasDeleted ? "Lock cleared successfully" : "Lock delete attempted (may still exist)",
        lockKey,
        lockExisted: lockExists,
        lockValue: lockValue || null,
        wasDeleted,
      });
    } catch (error: any) {
      // If Upstash is at rate limit, still return success (lock might be cleared)
      if (error?.message?.includes("max requests limit exceeded")) {
        return NextResponse.json({
          ok: true,
          message: "Lock clear attempted (Upstash rate limit hit, but lock may be cleared)",
          lockKey,
          warning: "Upstash rate limit exceeded",
          lockExisted: lockExists,
        });
      }
      throw error;
    }
  } catch (error) {
    console.error("[admin/clear-score-snapshots-lock] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
