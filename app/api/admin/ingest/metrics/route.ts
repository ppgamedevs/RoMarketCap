/**
 * PROMPT 54: Get discovery queue metrics
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { DiscoveryStatus } from "@prisma/client";

export async function GET(req: Request) {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const counts = await prisma.discoveredCompany.groupBy({
      by: ["status"],
      _count: true,
    });

    const metrics: Record<DiscoveryStatus, number> = {
      NEW: 0,
      VERIFIED: 0,
      INVALID: 0,
      ERROR: 0,
      REJECTED: 0,
      DUPLICATE: 0,
    };

    for (const count of counts) {
      metrics[count.status] = count._count;
    }

    return NextResponse.json({ ok: true, metrics });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

