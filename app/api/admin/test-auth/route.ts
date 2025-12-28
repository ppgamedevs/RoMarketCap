import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Test endpoint to check if PrismaAdapter can create/update users
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

    const results: {
      ok: boolean;
      tests: Record<string, unknown>;
    } = {
      ok: true,
      tests: {},
    };

    // Test 1: Try to create a test user (simulating what PrismaAdapter does)
    try {
      const testEmail = `test-${Date.now()}@example.com`;
      const testUser = await prisma.user.create({
        data: {
          email: testEmail,
          name: "Test User",
          password: null, // OAuth users have null password
          emailVerified: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
        },
      });
      results.tests.createUser = { success: true, userId: testUser.id };
      
      // Clean up
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => null);
      results.tests.cleanup = { success: true };
    } catch (error: any) {
      results.tests.createUser = { 
        success: false, 
        error: error.message,
        code: error.code,
        meta: error.meta,
      };
    }

    // Test 2: Try to create an account (what PrismaAdapter does for OAuth)
    try {
      // First create a user
      const testEmail = `test-account-${Date.now()}@example.com`;
      const testUser = await prisma.user.create({
        data: {
          email: testEmail,
          name: "Test Account User",
          password: null,
        },
      });

      // Then create an account
      const testAccount = await prisma.account.create({
        data: {
          userId: testUser.id,
          type: "oauth",
          provider: "github",
          providerAccountId: `test-${Date.now()}`,
        },
        select: {
          id: true,
          userId: true,
          provider: true,
        },
      });
      results.tests.createAccount = { success: true, accountId: testAccount.id };
      
      // Clean up
      await prisma.account.delete({ where: { id: testAccount.id } }).catch(() => null);
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => null);
      results.tests.cleanupAccount = { success: true };
    } catch (error: any) {
      results.tests.createAccount = { 
        success: false, 
        error: error.message,
        code: error.code,
        meta: error.meta,
      };
    }

    // Test 3: Try to create a session
    try {
      const testEmail = `test-session-${Date.now()}@example.com`;
      const testUser = await prisma.user.create({
        data: {
          email: testEmail,
          name: "Test Session User",
          password: null,
        },
      });

      const testSession = await prisma.session.create({
        data: {
          userId: testUser.id,
          sessionToken: `test-token-${Date.now()}`,
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
        select: {
          id: true,
          userId: true,
          sessionToken: true,
        },
      });
      results.tests.createSession = { success: true, sessionId: testSession.id };
      
      // Clean up
      await prisma.session.delete({ where: { id: testSession.id } }).catch(() => null);
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => null);
      results.tests.cleanupSession = { success: true };
    } catch (error: any) {
      results.tests.createSession = { 
        success: false, 
        error: error.message,
        code: error.code,
        meta: error.meta,
      };
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error("[test-auth] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

