import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { providerRegistry } from "@/src/lib/providers/registry";
import { isFlagEnabled } from "@/src/lib/flags/flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const providers = providerRegistry.getAll();
    const providersWithStats = await Promise.all(
      providers.map(async (provider) => {
        const metadata = provider.getMetadata();
        const flagKey = `PROVIDER_${metadata.id.toUpperCase().replace(/-/g, "_")}`;
        const enabled = await isFlagEnabled(flagKey, false);
        const stats = await providerRegistry.getProviderStats(metadata.id).catch(() => ({
          requestsToday: 0,
          errorsToday: 0,
          costToday: 0,
        }));

        return {
          ...metadata,
          enabled,
          stats,
        };
      }),
    );

    return NextResponse.json({
      ok: true,
      providers: providersWithStats,
    });
  } catch (error) {
    console.error("[admin:providers] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

