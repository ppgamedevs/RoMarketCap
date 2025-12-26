/**
 * PROMPT 53: Admin endpoint to get provider runs
 * 
 * GET /api/admin/providers/runs?providerId=...
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const providerId = url.searchParams.get("providerId");

    const runs = await prisma.providerRun.findMany({
      where: providerId ? { providerId } : undefined,
      orderBy: { startedAt: "desc" },
      take: 20,
      select: {
        id: true,
        providerId: true,
        startedAt: true,
        finishedAt: true,
        status: true,
        cursorIn: true,
        cursorOut: true,
        itemsFetched: true,
        itemsUpserted: true,
        itemsRejected: true,
        errorSummary: true,
        runtimeMs: true,
      },
    });

    return NextResponse.json({ ok: true, runs });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

