import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { updateCompanyIntegrity } from "@/src/lib/integrity/updateIntegrity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const updated = await updateCompanyIntegrity(id);

  if (!updated) {
    return NextResponse.json({ ok: false, error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    companyId: id,
    integrityScore: updated.companyIntegrityScore,
    dataConfidence: updated.dataConfidence,
    riskFlags: updated.companyRiskFlags,
  });
}

