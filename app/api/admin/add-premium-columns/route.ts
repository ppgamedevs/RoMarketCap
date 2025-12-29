import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") || req.headers.get("x-migration-secret");
  const expectedSecret = process.env.MIGRATION_SECRET || "temp-migration-2024";

  if (secret !== expectedSecret) {
    return NextResponse.json({
      ok: false,
      error: "Unauthorized. Add ?secret=temp-migration-2024 to the URL."
    }, { status: 401 });
  }

  try {
    // Add premium_since column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "premium_since" TIMESTAMP(3);
    `);

    // Add premium_until column
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "premium_until" TIMESTAMP(3);
    `);

    return NextResponse.json({ 
      ok: true, 
      message: "Premium columns added successfully",
      columns: ["premium_since", "premium_until"]
    });
  } catch (error) {
    console.error("[add-premium-columns] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

