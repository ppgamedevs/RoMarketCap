/**
 * PROMPT 53: Admin endpoint to reset provider cursor
 * 
 * POST /api/admin/providers/reset-cursor
 * Body: { providerId }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/src/lib/auth/requireAdmin";
import { ingestionProviderRegistry } from "@/src/lib/providers/ingestion/registry";
import { kv } from "@vercel/kv";

const BodySchema = z.object({
  providerId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
    }

    const { providerId } = parsed.data;

    const provider = ingestionProviderRegistry.get(providerId);
    if (!provider) {
      return NextResponse.json({ ok: false, error: `Provider ${providerId} not found` }, { status: 404 });
    }

    // Delete cursor
    const cursorKey = `provider:cursor:${providerId}`;
    await kv.del(cursorKey).catch(() => null);

    return NextResponse.json({ ok: true, message: "Cursor reset" });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

