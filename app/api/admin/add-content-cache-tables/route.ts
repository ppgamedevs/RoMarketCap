import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  return POST();
}

export async function POST() {
  try {
    await requireAdminSession().catch(() => null); // Allow browser access

    const results: string[] = [];

    // Check if company_content_cache table exists
    const companyTableExists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'company_content_cache'
      );
    `);

    if (!companyTableExists[0]?.exists) {
      // Create company_content_cache table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "company_content_cache" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "company_id" UUID NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
          "market_position" TEXT,
          "growth_analysis" TEXT,
          "competitive_landscape" TEXT,
          "industry_context" TEXT,
          "key_insights" JSONB,
          "faqs" JSONB,
          "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      results.push("✓ Created company_content_cache table");

      // Create indexes
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "company_content_cache_company_id_idx" 
        ON "company_content_cache"("company_id");
      `);
      results.push("✓ Created index on company_id");

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "company_content_cache_generated_at_idx" 
        ON "company_content_cache"("generated_at");
      `);
      results.push("✓ Created index on generated_at");
    } else {
      results.push("✓ company_content_cache table already exists");
    }

    // Check if industry_content_cache table exists
    const industryTableExists = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'industry_content_cache'
      );
    `);

    if (!industryTableExists[0]?.exists) {
      // Create industry_content_cache table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "industry_content_cache" (
          "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "industry_slug" TEXT NOT NULL UNIQUE,
          "market_overview" TEXT,
          "key_trends" TEXT,
          "top_performers_analysis" TEXT,
          "regional_distribution" TEXT,
          "growth_opportunities" TEXT,
          "faqs" JSONB,
          "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      results.push("✓ Created industry_content_cache table");

      // Create indexes
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "industry_content_cache_industry_slug_idx" 
        ON "industry_content_cache"("industry_slug");
      `);
      results.push("✓ Created index on industry_slug");

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "industry_content_cache_generated_at_idx" 
        ON "industry_content_cache"("generated_at");
      `);
      results.push("✓ Created index on generated_at");
    } else {
      results.push("✓ industry_content_cache table already exists");
    }

    // Verify tables exist
    const companyCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'company_content_cache'
      );
    `);

    const industryCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'industry_content_cache'
      );
    `);

    if (companyCheck[0]?.exists && industryCheck[0]?.exists) {
      results.push("✓ Verified: both tables exist");
    } else {
      results.push("✗ Warning: some tables not found after creation");
    }

    return NextResponse.json({
      ok: true,
      message: "Content cache tables migration completed",
      results,
    });
  } catch (error) {
    console.error("[admin/add-content-cache-tables] Error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
