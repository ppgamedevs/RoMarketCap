/**
 * PROMPT 53: List ingestion providers
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/src/lib/auth/requireAdmin";
import { ingestionProviderRegistry } from "@/src/lib/providers/ingestion/registry";
import { kv } from "@vercel/kv";
import { prisma } from "@/src/lib/db";

export async function GET(req: Request) {
  try {
    await requireAdmin();

    const providers = ingestionProviderRegistry.getAll();
    const providersWithStats = await Promise.all(
      providers.map(async (provider) => {
        const providerId = provider.id;
        
        // Get feature flag status
        const flagKey = `flag:PROVIDER_${providerId.toUpperCase().replace(/-/g, "_")}`;
        const enabled = (await kv.get<boolean>(flagKey).catch(() => null)) ?? true;

        // Get cursor
        const cursorKey = `provider:cursor:${providerId}`;
        const cursor = await kv.get<string>(cursorKey).catch(() => null);

        // Get last run
        const lastRun = await prisma.providerRun.findFirst({
          where: { providerId },
          orderBy: { startedAt: "desc" },
          select: {
            id: true,
            startedAt: true,
            finishedAt: true,
            status: true,
            itemsFetched: true,
            itemsUpserted: true,
            itemsRejected: true,
            cursorOut: true,
          },
        });

        // Get KV stats
        const statsKey = `provider:stats:${providerId}`;
        const stats = await kv.get<string>(statsKey).catch(() => null);
        const parsedStats = stats ? JSON.parse(stats) : null;

        return {
          id: provider.id,
          displayName: provider.displayName,
          supports: provider.supports,
          rateLimit: provider.rateLimit,
          enabled,
          cursor: cursor || null,
          lastRun: lastRun
            ? {
                id: lastRun.id,
                startedAt: lastRun.startedAt.toISOString(),
                finishedAt: lastRun.finishedAt?.toISOString() || null,
                status: lastRun.status,
                itemsFetched: lastRun.itemsFetched,
                itemsUpserted: lastRun.itemsUpserted,
                itemsRejected: lastRun.itemsRejected,
                cursorOut: lastRun.cursorOut,
              }
            : null,
          stats: parsedStats,
        };
      }),
    );

    return NextResponse.json({ ok: true, providers: providersWithStats });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

