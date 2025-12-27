/**
 * PROMPT 58: Get financial sync dead letter entries
 */

import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { getFinancialDeadLetters } from "@/src/lib/connectors/anaf/financialDeadletter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const entries = await getFinancialDeadLetters(100);

    return NextResponse.json({ ok: true, entries });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

