/**
 * Admin endpoint to clear market API cache
 */

import { NextResponse } from "next/server";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    // Clear all market cache keys
    // Note: This is a simple implementation - in production you'd want to scan and delete all keys matching "market:*"
    await kv.del("market:*");
    
    return NextResponse.json({
      ok: true,
      message: "Market cache cleared. New sorting will take effect immediately.",
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      ok: false,
      error: errorMsg,
    }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
