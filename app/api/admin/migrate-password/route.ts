import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin endpoint to run the password column migration
 * This is a temporary endpoint to add the password column to the users table
 */
export async function POST(req: Request) {
  try {
    // Require admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Check if column already exists
    try {
      await prisma.$queryRaw`SELECT password FROM users LIMIT 1`;
      return NextResponse.json({ 
        ok: true, 
        message: "Password column already exists",
        alreadyExists: true 
      });
    } catch (error: any) {
      // Column doesn't exist, add it
      if (error?.code === "42703" || error?.message?.includes("column") || error?.message?.includes("password")) {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "users" 
          ADD COLUMN IF NOT EXISTS "password" TEXT;
        `);
        
        return NextResponse.json({ 
          ok: true, 
          message: "Password column added successfully",
          alreadyExists: false 
        });
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("[migrate-password] Error:", error);
    return NextResponse.json({ 
      ok: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
}

