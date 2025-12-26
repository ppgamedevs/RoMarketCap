/**
 * PROMPT 53: Admin endpoint to manually trigger provider ingestion
 * 
 * POST /api/admin/providers/run
 * Body: { providerId, dry, limit }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { ingestionProviderRegistry } from "@/src/lib/providers/ingestion/registry";
import { ingestProviderPage } from "@/src/lib/providers/ingestion/ingest";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { acquireLockWithRetry } from "@/src/lib/locks/distributed";

const BodySchema = z.object({
  providerId: z.string().min(1),
  dry: z.boolean().optional().default(false),
  limit: z.number().int().min(1).max(1000).optional().default(200),
});

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
    }

    const { providerId, dry, limit } = parsed.data;

    const provider = ingestionProviderRegistry.get(providerId);
    if (!provider) {
      return NextResponse.json({ ok: false, error: `Provider ${providerId} not found` }, { status: 404 });
    }

    // Acquire lock
    const lockKey = `lock:provider:${providerId}`;
    const lockId = await acquireLockWithRetry(lockKey, { ttl: 3600, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, error: "Provider is already running" }, { status: 409 });
    }

    try {
      // Get cursor
      const cursorKey = `provider:cursor:${providerId}`;
      const cursor = (await kv.get<string>(cursorKey).catch(() => null)) || undefined;

      // Create run record
      let runId: string | undefined;
      if (!dry) {
        const run = await prisma.providerRun.create({
          data: {
            providerId,
            status: "RUNNING",
            cursorIn: cursor || null,
            startedAt: new Date(),
          },
        });
        runId = run.id;
      }

      const startTime = Date.now();

      // Ingest page
      const result = await ingestProviderPage(provider, cursor, limit, {
        dryRun: dry,
        runId,
        providerId,
      });

      const runtimeMs = Date.now() - startTime;

      // Update cursor
      if (!dry && result.cursorOut) {
        await kv.set(cursorKey, result.cursorOut, { ex: 60 * 60 * 24 * 7 }).catch(() => null);
      } else if (!dry && !result.cursorOut) {
        await kv.del(cursorKey).catch(() => null);
      }

      // Update run record
      if (!dry && runId) {
        const status = result.stats.itemsRejected > result.stats.itemsFetched / 2 ? "PARTIAL" : "SUCCESS";
        const errorSummary =
          result.stats.errors.length > 0
            ? result.stats.errors.slice(0, 10).map((e) => e.error).join("; ")
            : null;

        await prisma.providerRun.update({
          where: { id: runId },
          data: {
            status,
            finishedAt: new Date(),
            cursorOut: result.cursorOut || null,
            itemsFetched: result.stats.itemsFetched,
            itemsUpserted: result.stats.itemsUpserted,
            itemsRejected: result.stats.itemsRejected,
            errorSummary,
            runtimeMs,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        dry,
        cursorOut: result.cursorOut,
        stats: result.stats,
        runtimeMs,
      });
    } finally {
      await import("@/src/lib/locks/distributed").then(({ releaseLock }) => releaseLock(lockKey, lockId));
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

