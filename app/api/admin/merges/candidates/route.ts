/**
 * PROMPT 60: Get merge candidates
 * 
 * GET /api/admin/merges/candidates
 * Query: status?, confidence?, limit?, offset?
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { prisma } from "@/src/lib/db";
import { Prisma } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
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

    const url = new URL(req.url);
    const status = url.searchParams.get("status") || "PENDING";
    const minConfidence = parseInt(url.searchParams.get("confidence") || "50", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const where: Prisma.MergeCandidateWhereInput = {
      confidence: { gte: minConfidence },
    };

    if (status !== "ALL") {
      where.status = status as any;
    }

    const [candidates, total] = await Promise.all([
      prisma.mergeCandidate.findMany({
        where,
        include: {
          sourceCompany: {
            select: {
              id: true,
              name: true,
              legalName: true,
              cui: true,
              domain: true,
              county: true,
              industry: true,
            },
          },
          targetCompany: {
            select: {
              id: true,
              name: true,
              legalName: true,
              cui: true,
              domain: true,
              county: true,
              industry: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { confidence: "desc" },
          { createdAt: "desc" },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.mergeCandidate.count({ where }),
    ]);

    return NextResponse.json({
      ok: true,
      candidates,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[admin/merges/candidates] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

