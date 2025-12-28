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

    const hasGitHub = providers.some((p) => p.id === "github");
    const hasCredentials = providers.some((p) => p.id === "credentials");
    const githubClientId = process.env.GITHUB_CLIENT_ID;
    const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

    return NextResponse.json({
      ok: true,
      providers,
      hasGitHub,
      hasCredentials,
      githubClientId: githubClientId ? "***SET***" : "NOT SET",
      githubClientSecret: githubClientSecret ? "***SET***" : "NOT SET",
      // Debug info
      debug: {
        providerCount: providers.length,
        providerIds: providers.map((p) => p.id),
        envVarsPresent: {
          GITHUB_CLIENT_ID: !!githubClientId,
          GITHUB_CLIENT_SECRET: !!githubClientSecret,
        },
      },
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

