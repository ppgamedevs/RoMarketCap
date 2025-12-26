import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { providerRegistry } from "@/src/lib/providers/registry";
import { storeEnrichmentAsProvenance } from "@/src/lib/providers/store";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    const cui = body?.cui;

    if (!cui || typeof cui !== "string") {
      return NextResponse.json({ ok: false, error: "CUI required" }, { status: 400 });
    }

    const provider = providerRegistry.get(id);
    if (!provider) {
      return NextResponse.json({ ok: false, error: "Provider not found" }, { status: 404 });
    }

    // Check feature flag (using KV directly since flag names are dynamic)
    const flagKey = `flag:PROVIDER_${id.toUpperCase().replace(/-/g, "_")}`;
    const enabled = await kv.get<boolean>(flagKey).catch(() => true); // Default to enabled if not set
    if (!enabled) {
      return NextResponse.json({ ok: false, error: "Provider is disabled" }, { status: 403 });
    }

    const result = await provider.enrichCompany(cui);
    if (!result) {
      return NextResponse.json({ ok: false, error: "No enrichment data available" }, { status: 404 });
    }

    // Store as provenance
    await storeEnrichmentAsProvenance(result, id);
    await providerRegistry.recordRequest(id);

    return NextResponse.json({
      ok: true,
      result,
    });
  } catch (error) {
    const { id } = await ctx.params;
    console.error(`[admin:providers:${id}:enrich] Error:`, error);
    await providerRegistry.recordError(id, error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

