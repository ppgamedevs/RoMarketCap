import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Check NextAuth configuration
 */
export async function GET(req: NextRequest) {
  try {
    const secret = req.nextUrl.searchParams.get("secret") || req.headers.get("x-migration-secret");
    const expectedSecret = process.env.MIGRATION_SECRET || "temp-migration-2024";
    
    if (secret !== expectedSecret) {
      return NextResponse.json({ 
        ok: false, 
        error: "Unauthorized. Add ?secret=temp-migration-2024 to the URL." 
      }, { status: 401 });
    }

    const results = {
      ok: true,
      config: {
        hasGitHubClientId: Boolean(process.env.GITHUB_CLIENT_ID),
        hasGitHubClientSecret: Boolean(process.env.GITHUB_CLIENT_SECRET),
        hasNextAuthSecret: Boolean(process.env.NEXTAUTH_SECRET),
        hasNextAuthUrl: Boolean(process.env.NEXTAUTH_URL),
        sessionStrategy: "jwt", // We're using JWT now
        githubProviderEnabled: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
        credentialsProviderEnabled: true, // Always enabled
      },
      // Don't expose actual secrets, just whether they exist
      env: {
        GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID ? "***SET***" : "NOT SET",
        GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET ? "***SET***" : "NOT SET",
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "***SET***" : "NOT SET",
        NEXTAUTH_URL: process.env.NEXTAUTH_URL || "NOT SET",
      },
    };

    return NextResponse.json(results);
  } catch (error) {
    console.error("[check-auth-config] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

