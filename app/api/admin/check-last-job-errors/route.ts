/**
 * Check errors from the last national ingestion job
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Get last job
    const lastJob = await prisma.$queryRawUnsafe<Array<{
      id: string;
      status: string;
      mode: string;
      discovered: number;
      upserted: number;
      errors: number;
      started_at: Date;
      finished_at: Date | null;
      notes: string | null;
    }>>(`
      SELECT id, status, mode, discovered, upserted, errors, started_at, finished_at, notes
      FROM national_ingest_jobs
      ORDER BY started_at DESC
      LIMIT 1
    `);

    if (lastJob.length === 0) {
      return NextResponse.json({ ok: true, message: "No jobs found" });
    }

    const job = lastJob[0]!;

    // Get errors for this job
    const errors = await prisma.$queryRawUnsafe<Array<{
      id: string;
      cui: string | null;
      source_type: string;
      reason: string;
      created_at: Date;
    }>>(`
      SELECT id, cui, source_type, reason, created_at
      FROM national_ingest_errors
      WHERE job_id = $1
      ORDER BY created_at DESC
      LIMIT 50
    `, job.id);

    return NextResponse.json({
      ok: true,
      job: {
        id: job.id,
        status: job.status,
        mode: job.mode,
        discovered: job.discovered,
        upserted: job.upserted,
        errors: job.errors,
        startedAt: job.started_at,
        finishedAt: job.finished_at,
        notes: job.notes,
      },
      errorCount: errors.length,
      errors: errors.map(e => ({
        id: e.id,
        cui: e.cui,
        sourceType: e.source_type,
        reason: e.reason,
        createdAt: e.created_at,
      })),
    });
  } catch (error) {
    console.error("[admin/check-last-job-errors] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

