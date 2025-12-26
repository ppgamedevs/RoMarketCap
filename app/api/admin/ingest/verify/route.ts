/**
 * PROMPT 54: Admin endpoint to verify next N discovered companies
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { verifyAndUpsert } from "@/src/lib/ingest/verifyAndUpsert";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export async function POST(req: Request) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400 });
    }

    const { limit } = parsed.data;

    const budget = { count: limit };
    const toVerify = await prisma.discoveredCompany.findMany({
      where: {
        status: "NEW",
      },
      orderBy: { discoveredAt: "asc" },
      take: limit,
    });

    const stats = {
      verified: 0,
      invalid: 0,
      errors: 0,
    };

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

    return NextResponse.json({
      ok: true,
      verified: stats.verified,
      invalid: stats.invalid,
      errors: stats.errors,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

