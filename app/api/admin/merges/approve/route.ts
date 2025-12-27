/**
 * PROMPT 60: Approve merge
 * 
 * POST /api/admin/merges/approve
 * Body: { candidateId: string, reviewNote?: string }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { shouldBlockMutation } from "@/src/lib/flags/readOnly";
import { applyMerge } from "@/src/lib/merge/applyMerge";
import { prisma } from "@/src/lib/db";
import { logAdminAction } from "@/src/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  candidateId: z.string().uuid(),
  reviewNote: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check feature flag
    const adminEnabled = await isFlagEnabled("MERGE_ADMIN_ENABLED", false);
    if (!adminEnabled) {
      return NextResponse.json(
        { ok: false, error: "Merge admin endpoints are disabled via feature flag" },
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

    const { candidateId, reviewNote } = parsed.data;

    // Get candidate
    const candidate = await prisma.mergeCandidate.findUnique({
      where: { id: candidateId },
      include: {
        sourceCompany: { select: { id: true, name: true } },
        targetCompany: { select: { id: true, name: true } },
      },
    });

    if (!candidate) {
      return NextResponse.json({ ok: false, error: "Merge candidate not found" }, { status: 404 });
    }

    if (candidate.status !== "PENDING") {
      return NextResponse.json(
        { ok: false, error: `Candidate already ${candidate.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    // Apply merge
    const result = await applyMerge(candidate.sourceCompanyId, candidate.targetCompanyId, {
      actorUserId: session.user.id,
      preserveProvenance: true,
    });

    if (!result.success) {
      return NextResponse.json(
        { ok: false, error: result.error || "Merge failed" },
        { status: 500 }
      );
    }

    // Update candidate status
    await prisma.mergeCandidate.update({
      where: { id: candidateId },
      data: {
        status: "APPROVED",
        reviewedByUserId: session.user.id,
        reviewedAt: new Date(),
        reviewNote: reviewNote || null,
      },
    });

    // Log admin action
    await logAdminAction({
      actorUserId: session.user.id,
      action: "merge_approve",
      entityType: "merge_candidate",
      entityId: candidateId,
      metadata: {
        sourceCompanyId: candidate.sourceCompanyId,
        targetCompanyId: candidate.targetCompanyId,
        canonicalCompanyId: result.canonicalCompanyId,
        mergedCompanyId: result.mergedCompanyId,
        aliasesCreated: result.aliasesCreated,
      },
    }).catch(() => null);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    console.error("[admin/merges/approve] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

