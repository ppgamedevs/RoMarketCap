import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { providerRegistry } from "@/src/lib/providers/registry";
import { kv } from "@vercel/kv";

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
        // Use KV directly since flag names are dynamic
        const flagKey = `flag:PROVIDER_${metadata.id.toUpperCase().replace(/-/g, "_")}`;
        const enabled = await kv.get<boolean>(flagKey).catch(() => true); // Default to enabled if not set
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

