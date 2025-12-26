/**
 * PROMPT 54: Admin endpoint to run ingestion
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { DiscoverySource } from "@prisma/client";
import { SEAPAdapter } from "@/src/lib/ingest/adapters/seap";
import { EUFundsAdapter } from "@/src/lib/ingest/adapters/euFunds";
import { verifyAndUpsert } from "@/src/lib/ingest/verifyAndUpsert";

const QuerySchema = z.object({
  source: z.enum(["SEAP", "EU_FUNDS"]),
  discoverLimit: z.coerce.number().int().min(1).max(1000).optional().default(200),
  verifyLimit: z.coerce.number().int().min(1).max(100).optional().default(20),
  dry: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400 });
    }

    const { source, discoverLimit, verifyLimit, dry } = parsed.data;
    const dryRun = dry === "1" || dry === "true";

    // Get adapter
    const adapter = source === "SEAP" ? new SEAPAdapter() : new EUFundsAdapter();

    // Get or create run
    let run = await prisma.ingestRun.create({
      data: {
        source: source as DiscoverySource,
        status: "STARTED",
        startedAt: new Date(),
        statsJson: {
          discovered: 0,
          invalid: 0,
          duplicates: 0,
          verified: 0,
          errors: 0,
        },
      },
    });

    const stats = {
      discovered: 0,
      invalid: 0,
      duplicates: 0,
      verified: 0,
      errors: 0,
    };

    let lastCursor: string | undefined;

    try {
      // Discover
      let discoveredCount = 0;
      for await (const record of adapter.discover({ cursor: run.cursor || undefined, limit: discoverLimit })) {
        if (discoveredCount >= discoverLimit) {
          break;
        }

        if (!dryRun) {
          try {
            await prisma.discoveredCompany.upsert({
              where: {
                discovered_company_unique: {
                  cui: record.cui,
                  source: source as DiscoverySource,
                },
              },
              create: {
                cui: record.cui,
                source: source as DiscoverySource,
                status: "NEW",
                evidenceJson: record.evidence as Record<string, unknown>,
                discoveredAt: record.discoveredAt || new Date(),
              },
              update: {},
            });
            stats.discovered++;
          } catch {
            stats.duplicates++;
          }
        } else {
          stats.discovered++;
        }

        discoveredCount++;
        lastCursor = String(discoveredCount);
      }

      // Verify
      if (!dryRun) {
        const budget = { count: verifyLimit };
        const toVerify = await prisma.discoveredCompany.findMany({
          where: {
            source: source as DiscoverySource,
            status: "NEW",
          },
          orderBy: { discoveredAt: "asc" },
          take: verifyLimit,
        });

        for (const discovered of toVerify) {
          const result = await verifyAndUpsert(discovered.id, budget);

          if (result.status === "VERIFIED") {
            stats.verified++;
          } else if (result.status === "INVALID" || result.status === "REJECTED") {
            stats.invalid++;
          } else {
            stats.errors++;
          }

          if (budget.count <= 0) {
            break;
          }
        }
      }

      // Update run
      if (!dryRun) {
        await prisma.ingestRun.update({
          where: { id: run.id },
          data: {
            status: stats.errors > stats.discovered / 2 ? "PARTIAL" : "COMPLETED",
            finishedAt: new Date(),
            cursor: lastCursor || null,
            statsJson: stats,
          },
        });
      }

      return NextResponse.json({
        ok: true,
        dry: dryRun,
        stats,
        cursor: lastCursor || null,
      });
    } catch (error) {
      if (!dryRun) {
        await prisma.ingestRun.update({
          where: { id: run.id },
          data: {
            status: "FAILED",
            finishedAt: new Date(),
            lastError: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

