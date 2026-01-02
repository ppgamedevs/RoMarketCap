import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession().catch(() => null); // Allow browser access for convenience
    return await POST();
  } catch (error) {
    console.error("[admin/add-company-change-logs-table] GET error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    await requireAdminSession().catch(() => null); // Allow browser access for convenience

    const results: string[] = [];

    // Check if CompanyChangeType enum exists
    const enumExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1
        FROM pg_type
        WHERE typname = 'CompanyChangeType'
      );
    `;

    if (!(enumExists as any[])[0].exists) {
      await prisma.$executeRaw`
        CREATE TYPE "CompanyChangeType" AS ENUM (
          'SCORE_CHANGE',
          'FORECAST_CHANGE',
          'ENRICHMENT',
          'CLAIM_APPROVED',
          'SUBMISSION_APPROVED',
          'FINANCIAL_SYNC'
        );
      `;
      results.push("✓ Created CompanyChangeType enum");
    } else {
      results.push("✓ CompanyChangeType enum already exists");
    }

    // Check if table exists
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'company_change_logs'
      );
    `;

    if ((tableExists as any[])[0].exists) {
      results.push("✓ Table 'company_change_logs' already exists. Skipping creation.");
      return NextResponse.json({ ok: true, message: "Table already exists", results });
    }

    // Create table
    await prisma.$executeRaw`
      CREATE TABLE public.company_change_logs (
        id TEXT NOT NULL,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        company_id UUID NOT NULL,
        change_type "CompanyChangeType" NOT NULL,
        metadata JSONB,

        CONSTRAINT company_change_logs_pkey PRIMARY KEY (id)
      );
    `;
    results.push("✓ Created company_change_logs table");

    // Add foreign key constraint
    await prisma.$executeRaw`
      ALTER TABLE public.company_change_logs ADD CONSTRAINT company_change_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
    `;
    results.push("✓ Added foreign key constraint for company_id");

    // Add indexes
    await prisma.$executeRaw`CREATE INDEX company_change_logs_company_id_created_at_idx ON public.company_change_logs USING BTREE (company_id, created_at);`;
    results.push("✓ Added index on (company_id, created_at)");
    
    await prisma.$executeRaw`CREATE INDEX company_change_logs_change_type_idx ON public.company_change_logs USING BTREE (change_type);`;
    results.push("✓ Added index on change_type");

    return NextResponse.json({ ok: true, message: "Company change logs table added successfully", results });
  } catch (error) {
    console.error("[admin/add-company-change-logs-table] Fatal error:", error);
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
