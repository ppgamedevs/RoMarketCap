/**
 * PROMPT 58: Admin endpoint to sync financials for a batch of companies
 * 
 * POST /api/admin/financial/sync-batch
 * Body: { limit?: number, onlyMissing?: boolean, maxAgeDays?: number, dryRun?: boolean }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { shouldBlockMutation } from "@/src/lib/flags/readOnly";
import { acquireLockWithRetry, releaseLock } from "@/src/lib/locks/distributed";
import { syncCompanyFinancialsByCui } from "@/src/lib/connectors/anaf/syncFinancials";
import { prisma } from "@/src/lib/db";
import { Prisma, CompanyFinancialDataSource } from "@prisma/client";
import { kv } from "@vercel/kv";
import { logAdminAction } from "@/src/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(10),
  onlyMissing: z.boolean().optional().default(false),
  maxAgeDays: z.number().int().min(1).max(365).optional(),
  dryRun: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check feature flag
    const adminEnabled = await isFlagEnabled("FINANCIAL_SYNC_ADMIN_ENABLED", false);
    if (!adminEnabled) {
      return NextResponse.json(
        { ok: false, error: "Financial sync admin endpoints are disabled via feature flag" },
        { status: 503 }
      );
    }

    const globalEnabled = await isFlagEnabled("FINANCIAL_SYNC_ENABLED", false);
    if (!globalEnabled) {
      return NextResponse.json(
        { ok: false, error: "Financial sync feature is disabled via feature flag" },
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

    const { limit, onlyMissing, maxAgeDays, dryRun } = parsed.data;

    // Acquire distributed lock
    const lockId = await acquireLockWithRetry("financial:sync:batch", { ttl: 3600, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, error: "Another batch sync is in progress" }, { status: 409 });
    }

    try {
      // Create sync job
      let jobId: string | null = null;
      if (!dryRun) {
        const job = await prisma.financialSyncJob.create({
          data: {
            mode: dryRun ? "DRY_RUN" : "LIVE",
            limit,
            status: "STARTED",
          },
        });
        jobId = job.id;
      }

      // Build query for companies to sync
      const where: Prisma.CompanyWhereInput = {
        isPublic: true,
        cui: { not: null },
      };

      if (onlyMissing) {
        where.lastFinancialSyncAt = null;
      } else if (maxAgeDays) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
        where.OR = [
          { lastFinancialSyncAt: null },
          { lastFinancialSyncAt: { lt: cutoffDate } },
        ];
      }

      // Get cursor from KV
      const cursorKey = "financial:sync:batch:cursor";
      const cursor = await kv.get<string>(cursorKey);

      // Fetch companies
      const companies = await prisma.company.findMany({
        where,
        select: {
          id: true,
          cui: true,
          name: true,
          lastFinancialSyncAt: true,
        },
        orderBy: { cui: "asc" },
        take: limit,
        ...(cursor ? { skip: 1, cursor: { cui: cursor } } : {}),
      });

      if (companies.length === 0) {
        return NextResponse.json({
          ok: true,
          message: "No companies to sync",
          stats: { processed: 0, ok: 0, failed: 0 },
        });
      }

      // Process companies
      const stats = {
        processed: 0,
        ok: 0,
        failed: 0,
        errors: [] as Array<{ cui: string; error: string }>,
      };

      let lastCursor: string | null = null;

      for (const company of companies) {
        if (!company.cui) continue;

        try {
          const result = await syncCompanyFinancialsByCui({
            cui: company.cui,
            dryRun,
            preferLatest: true,
          });

          stats.processed++;
          if (result.success) {
            stats.ok++;
          } else {
            stats.failed++;
            stats.errors.push({ cui: company.cui, error: result.error || "Unknown error" });
          }

          lastCursor = company.cui;
        } catch (error) {
          stats.processed++;
          stats.failed++;
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          stats.errors.push({ cui: company.cui || "unknown", error: errorMsg });
        }
      }

      // Update cursor
      if (lastCursor && !dryRun) {
        await kv.set(cursorKey, lastCursor);
      }

      // Update job
      if (jobId && !dryRun) {
        await prisma.financialSyncJob.update({
          where: { id: jobId },
          data: {
            finishedAt: new Date(),
            status: stats.failed === 0 ? "COMPLETED" : "FAILED",
            okCount: stats.ok,
            failCount: stats.failed,
            lastError: stats.errors.length > 0 ? stats.errors[0].error : null,
            stats: stats as Prisma.InputJsonValue,
          },
        });
      }

      // Log admin action
      if (!dryRun) {
        await logAdminAction({
          actorUserId: session.user.id,
          action: "financial_sync_batch",
          entityType: "batch",
          entityId: jobId || "dry-run",
          metadata: { limit, onlyMissing, maxAgeDays, stats },
        }).catch(() => null);
      }

      return NextResponse.json({
        ok: true,
        dryRun,
        stats,
        cursor: lastCursor,
      });
    } finally {
      await releaseLock("financial:sync:batch", lockId);
    }
  } catch (error) {
    console.error("[admin/financial/sync-batch] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

