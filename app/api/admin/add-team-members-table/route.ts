import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const results: string[] = [];

    // Create company_team_members table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "company_team_members" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "company_id" UUID NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
        "name" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "linkedin_url" TEXT,
        "photo_url" TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        "verified_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    results.push('✓ Created company_team_members table');

    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "company_team_members_company_id_idx" ON "company_team_members"("company_id");
    `);
    results.push('✓ Created index on company_id');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "company_team_members_company_id_order_idx" ON "company_team_members"("company_id", "order");
    `);
    results.push('✓ Created index on company_id and order');

    // Verify table exists
    const tableCheck = await prisma.$queryRawUnsafe<any[]>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'company_team_members';
    `);

    if (tableCheck.length > 0) {
      results.push('✓ Verified: table exists');
    } else {
      results.push('✗ Warning: table not found after creation');
    }

    return NextResponse.json({
      ok: true,
      message: 'Company team members table added successfully',
      results,
    });
  } catch (error) {
    console.error('[add-team-members-table] Error:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
