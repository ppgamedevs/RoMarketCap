import { NextResponse } from "next/server";
import { authOptions } from "@/src/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Test endpoint to check GitHub OAuth configuration
 */
export async function GET() {
  try {
    const githubProvider = authOptions.providers.find((p) => p.id === "github");
    
    if (!githubProvider) {
      return NextResponse.json({
        ok: false,
        error: "GitHub provider not found",
        hasClientId: !!process.env.GITHUB_CLIENT_ID,
        hasClientSecret: !!process.env.GITHUB_CLIENT_SECRET,
      });
    }

    return NextResponse.json({
      ok: true,
      provider: {
        id: githubProvider.id,
        name: githubProvider.name,
        type: githubProvider.type,
      },
      env: {
        hasClientId: !!process.env.GITHUB_CLIENT_ID,
        hasClientSecret: !!process.env.GITHUB_CLIENT_SECRET,
        hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL || "NOT SET",
      },
      expectedCallbackUrl: process.env.NEXTAUTH_URL 
        ? `${process.env.NEXTAUTH_URL}/api/auth/callback/github`
        : "NOT SET (check NEXTAUTH_URL)",
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

