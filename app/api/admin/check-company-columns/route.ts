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
    // Check if columns exist
    const columns = await prisma.$queryRawUnsafe<Array<{
      column_name: string;
      data_type: string;
      is_nullable: string;
      column_default: string | null;
    }>>(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'companies'
      AND column_name IN ('canonical_slug', 'is_demo')
      ORDER BY column_name;
    `);

    // Check indexes
    const indexes = await prisma.$queryRawUnsafe<Array<{
      indexname: string;
      indexdef: string;
    }>>(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'companies'
      AND (indexname LIKE '%canonical_slug%' OR indexname LIKE '%is_demo%')
      ORDER BY indexname;
    `);

    // Try to query using Prisma to see if it works
    let prismaCanonicalSlugWorks = false;
    let prismaIsDemoWorks = false;
    let prismaError: string | null = null;

    try {
      await prisma.$queryRaw`SELECT canonical_slug FROM companies LIMIT 1`;
      prismaCanonicalSlugWorks = true;
    } catch (err) {
      prismaError = err instanceof Error ? err.message : String(err);
    }

    try {
      await prisma.$queryRaw`SELECT is_demo FROM companies LIMIT 1`;
      prismaIsDemoWorks = true;
    } catch (err) {
      if (!prismaError) {
        prismaError = err instanceof Error ? err.message : String(err);
      }
    }

    // Try using Prisma's typed query
    let typedQueryWorks = false;
    let typedQueryError: string | null = null;
    try {
      await prisma.company.findFirst({
        select: { canonicalSlug: true, isDemo: true },
        take: 1,
      });
      typedQueryWorks = true;
    } catch (err) {
      typedQueryError = err instanceof Error ? err.message : String(err);
    }

    return NextResponse.json({
      ok: true,
      columns,
      indexes,
      prisma: {
        rawQuery: {
          canonicalSlug: prismaCanonicalSlugWorks,
          isDemo: prismaIsDemoWorks,
          error: prismaError,
        },
        typedQuery: {
          works: typedQueryWorks,
          error: typedQueryError,
        },
      },
    });
  } catch (error) {
    console.error("[check-company-columns] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

