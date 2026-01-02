import { NextResponse } from 'next/server';
import { prisma } from '@/src/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const results: string[] = [];

    // Create company_verification table
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "company_verification" (
        "id" TEXT PRIMARY KEY,
        "company_id" UUID NOT NULL UNIQUE REFERENCES "companies"("id") ON DELETE CASCADE,
        "is_active" BOOLEAN NOT NULL,
        "is_vat_registered" BOOLEAN NOT NULL,
        "last_reported_year" INTEGER,
        "verified_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "source" TEXT NOT NULL DEFAULT 'ANAF',
        "raw_response" JSONB,
        "error_message" TEXT,
        "verification_status" TEXT NOT NULL DEFAULT 'SUCCESS',
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    results.push('✓ Created company_verification table');

    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "company_verification_company_id_idx" ON "company_verification"("company_id");
    `);
    results.push('✓ Created index on company_id');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "company_verification_verified_at_idx" ON "company_verification"("verified_at");
    `);
    results.push('✓ Created index on verified_at');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "company_verification_verification_status_idx" ON "company_verification"("verification_status");
    `);
    results.push('✓ Created index on verification_status');

    // Verify table exists
    const tableCheck = await prisma.$queryRawUnsafe<any[]>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'company_verification';
    `);

    if (tableCheck.length > 0) {
      results.push('✓ Verified: table exists');
    } else {
      results.push('✗ Warning: table not found after creation');
    }

    // Check column types
    const columnCheck = await prisma.$queryRawUnsafe<any[]>(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'company_verification'
      ORDER BY ordinal_position;
    `);

    results.push(`✓ Verified: ${columnCheck.length} columns created`);

    return NextResponse.json({
      ok: true,
      message: 'Company verification table added successfully',
      results,
      columns: columnCheck.map(c => `${c.column_name} (${c.data_type})`),
    });
  } catch (error) {
    console.error('[add-company-verification-table] Error:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
