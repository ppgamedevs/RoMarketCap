/**
 * PROMPT 58: Admin endpoint to sync financials for a single company
 * 
 * POST /api/admin/financial/sync
 * Body: { cui: string, dryRun?: boolean, years?: number[] }
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import { shouldBlockMutation } from "@/src/lib/flags/readOnly";
import { syncCompanyFinancialsByCui } from "@/src/lib/connectors/anaf/syncFinancials";
import { prisma } from "@/src/lib/db";
import { logAdminAction } from "@/src/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  cui: z.string().min(1),
  dryRun: z.boolean().optional().default(false),
  years: z.array(z.number().int().min(1900).max(2100)).optional(),
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

    const { cui, dryRun, years } = parsed.data;

    // Get company for audit log
    const company = await prisma.company.findUnique({
      where: { cui: cui.replace(/^RO/i, "").replace(/\D/g, "") },
      select: { id: true, name: true, cui: true },
    });

    // Log admin action
    if (!dryRun && company) {
      await logAdminAction({
        actorUserId: session.user.id,
        action: "financial_sync",
        entityType: "company",
        entityId: company.id,
        metadata: { cui, years },
      }).catch(() => null);
    }

    // Sync financials
    const result = await syncCompanyFinancialsByCui({
      cui,
      dryRun,
      years,
      preferLatest: false,
    });

    return NextResponse.json({
      ok: result.success,
      result,
      company: company ? { id: company.id, name: company.name, cui: company.cui } : null,
    });
  } catch (error) {
    console.error("[admin/financial/sync] Error:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

