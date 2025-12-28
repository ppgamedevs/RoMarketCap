import { NextResponse } from "next/server";
import { authOptions } from "@/src/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Debug endpoint to check what providers are registered
 */
export async function GET() {
  try {
    const providers = authOptions.providers.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
    }));

    return NextResponse.json({
      ok: true,
      providers,
      hasGitHub: providers.some((p) => p.id === "github"),
      hasCredentials: providers.some((p) => p.id === "credentials"),
      githubClientId: process.env.GITHUB_CLIENT_ID ? "***SET***" : "NOT SET",
      githubClientSecret: process.env.GITHUB_CLIENT_SECRET ? "***SET***" : "NOT SET",
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

