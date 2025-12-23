import { NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { rateLimitAdmin } from "@/src/lib/ratelimit/admin";
import { acquireLockWithRetry, releaseLock } from "@/src/lib/locks/distributed";
import { prisma } from "@/src/lib/db";
import { CompanyImportRowSchema, parseCsvHeader, parseCsvRow, hashRow, type CompanyImportRow } from "@/src/lib/import/csvStream";
import { slugifyCompanyName } from "@/src/lib/slug";
import { ensureCanonicalSlug } from "@/src/lib/slug/canonical";
import { logAdminAction } from "@/src/lib/audit/log";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const BATCH_SIZE = 100; // Process in batches

/**
 * Stream CSV import with validation and deduplication.
 * POST /api/admin/import/stream
 * Body: multipart/form-data with file field "csv"
 * Query: ?sourceName=source0
 */
export async function POST(req: Request) {
  try {
    // Rate limit admin routes
    const rl = await rateLimitAdmin(req);
    if (!rl.ok) {
      return NextResponse.json({ ok: false, error: rl.error }, { status: rl.status, headers: rl.headers });
    }

    const session = await requireAdminSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401, headers: rl.headers });
    }

    // Check for distributed lock
    const lockId = await acquireLockWithRetry("import:csv", { ttl: 3600, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, error: "Another import is in progress" }, { status: 409, headers: rl.headers });
    }

    try {
      const formData = await req.formData();
      const file = formData.get("csv") as File | null;
      const sourceName = (formData.get("sourceName") as string | null) || "csv_import";

      if (!file) {
        return NextResponse.json({ ok: false, error: "Missing CSV file" }, { status: 400, headers: rl.headers });
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json({ ok: false, error: `File too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)` }, { status: 400, headers: rl.headers });
      }

      // Create import job
      const job = await prisma.importJob.create({
        data: {
          status: "PENDING",
          sourceName,
          totalRows: 0,
          processedRows: 0,
          errorRows: 0,
          startedAt: new Date(),
        },
      });

      // Process in background (fire and forget for now, but we update job status)
      processImportJob(job.id, file, sourceName, session.user.id).catch((error) => {
        console.error("[import] Background processing error:", error);
        Sentry.captureException(error);
      });

      return NextResponse.json({ ok: true, jobId: job.id, message: "Import started" }, { headers: rl.headers });
    } finally {
      await releaseLock("import:csv", lockId);
    }
  } catch (error) {
    console.error("[import] Error:", error);
    Sentry.captureException(error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function processImportJob(jobId: string, file: File, sourceName: string, actorUserId: string) {
  const startTime = Date.now();
  let totalRows = 0;
  let processedRows = 0;
  let errorRows = 0;
  let headerMap: Map<string, number> | null = null;
  const batch: Array<{ row: CompanyImportRow; rowNumber: number; rawRow: Record<string, string> }> = [];

  try {
    // Update job status
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: "RUNNING" },
    });

    // Read file as stream
    const text = await file.text();
    const lines = text.split("\n").filter((line) => line.trim());

    if (lines.length === 0) {
      throw new Error("Empty CSV file");
    }

    // Parse header
    headerMap = parseCsvHeader(lines[0]);
    totalRows = lines.length - 1; // Exclude header

    await prisma.importJob.update({
      where: { id: jobId },
      data: { totalRows },
    });

    // Process rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      try {
        const rawRow = parseCsvRow(line, headerMap);
        const parsed = CompanyImportRowSchema.safeParse(rawRow);

        if (!parsed.success) {
          errorRows++;
          await prisma.importRowError.create({
            data: {
              jobId,
              rowNumber: i + 1,
              reason: parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; "),
              rawRowJson: rawRow,
            },
          });
          continue;
        }

        batch.push({ row: parsed.data, rowNumber: i + 1, rawRow });

        // Process batch when full
        if (batch.length >= BATCH_SIZE) {
          const result = await processBatch(batch, sourceName, jobId);
          processedRows += result.processed;
          errorRows += result.errors;
          batch.length = 0; // Clear batch
        }
      } catch (error) {
        errorRows++;
        await prisma.importRowError.create({
          data: {
            jobId,
            rowNumber: i + 1,
            reason: error instanceof Error ? error.message : "Unknown error",
            rawRowJson: { raw: line },
          },
        });
      }
    }

    // Process remaining batch
    if (batch.length > 0) {
      const result = await processBatch(batch, sourceName, jobId);
      processedRows += result.processed;
      errorRows += result.errors;
    }

    // Update job status
    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "SUCCESS",
        processedRows,
        errorRows,
        finishedAt: new Date(),
        notes: `Processed ${processedRows} rows, ${errorRows} errors in ${Math.round((Date.now() - startTime) / 1000)}s`,
      },
    });

    // Log admin action
    await logAdminAction({
      actorUserId,
      action: "IMPORT_CSV",
      entityType: "IMPORT_JOB",
      entityId: jobId,
      metadata: { sourceName, totalRows, processedRows, errorRows },
    });
  } catch (error) {
    console.error("[import] Job processing error:", error);
    Sentry.captureException(error);

    await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        processedRows,
        errorRows,
        finishedAt: new Date(),
        notes: error instanceof Error ? error.message : "Unknown error",
      },
    });
  }
}

async function processBatch(
  batch: Array<{ row: CompanyImportRow; rowNumber: number; rawRow: Record<string, string> }>,
  sourceName: string,
  jobId: string,
): Promise<{ processed: number; errors: number }> {
  let processed = 0;
  let errors = 0;

  for (const { row, rowNumber, rawRow } of batch) {
    try {
      // Dedupe by CUI (preferred) or domain
      const existing = row.cui
        ? await prisma.company.findUnique({ where: { cui: row.cui } })
        : row.domain
          ? await prisma.company.findFirst({ where: { domain: row.domain } })
          : null;

      const rowHash = hashRow(rawRow);

      // Generate slug
      const baseSlug = slugifyCompanyName(row.name) || (row.cui ? `company-${row.cui.toLowerCase()}` : `company-${Date.now()}`);
      let slug = baseSlug;

      // Check slug collision
      const slugExists = await prisma.company.findFirst({
        where: {
          OR: [{ slug }, { canonicalSlug: slug }],
        },
      });

      if (slugExists && slugExists.cui !== row.cui) {
        slug = row.cui ? `${baseSlug}-${row.cui.toLowerCase()}` : `${baseSlug}-${Date.now()}`;
      }

      // Upsert company
      const company = existing
        ? await prisma.company.update({
            where: { id: existing.id },
            data: {
              name: row.name,
              legalName: row.legalName || row.name,
              tradeName: row.tradeName,
              cui: row.cui || existing.cui,
              domain: row.domain || existing.domain,
              website: row.website || existing.website,
              county: row.county || existing.county,
              countySlug: row.countySlug || existing.countySlug,
              city: row.city || existing.city,
              address: row.address || existing.address,
              industry: row.industry || existing.industry,
              industrySlug: row.industrySlug || existing.industrySlug,
              caenCode: row.caenCode || existing.caenCode,
              caenDescription: row.caenDescription || existing.caenDescription,
              email: row.email || existing.email,
              phone: row.phone || existing.phone,
              foundedYear: row.foundedYear || existing.foundedYear,
              employeeCountEstimate: row.employeeCountEstimate || existing.employeeCountEstimate,
            },
          })
        : await prisma.company.create({
            data: {
              slug,
              name: row.name,
              legalName: row.legalName || row.name,
              tradeName: row.tradeName,
              cui: row.cui || null,
              domain: row.domain || null,
              website: row.website || null,
              county: row.county || null,
              countySlug: row.countySlug || null,
              city: row.city || null,
              address: row.address || null,
              industry: row.industry || null,
              industrySlug: row.industrySlug || null,
              caenCode: row.caenCode || null,
              caenDescription: row.caenDescription || null,
              email: row.email || null,
              phone: row.phone || null,
              foundedYear: row.foundedYear || null,
              employeeCountEstimate: row.employeeCountEstimate || null,
              isPublic: true,
              visibilityStatus: "PUBLIC",
              isActive: true,
              sourceConfidence: 50,
            },
          });

      // Ensure canonical slug
      const canonicalSlug = await ensureCanonicalSlug(company.id, company.name, company.cui || null);
      if (company.canonicalSlug !== canonicalSlug) {
        await prisma.company.update({
          where: { id: company.id },
          data: { canonicalSlug },
        });
      }

      // Record provenance (check if exists first, then create or update)
      const existingProvenance = await prisma.companyProvenance.findFirst({
        where: {
          companyId: company.id,
          sourceName,
          rowHash,
        },
      });

      if (existingProvenance) {
        await prisma.companyProvenance.update({
          where: { id: existingProvenance.id },
          data: { importedAt: new Date() },
        });
      } else {
        await prisma.companyProvenance.create({
          data: {
            companyId: company.id,
            sourceName,
            rowHash,
            importedAt: new Date(),
          },
        });
      }

      processed++;
    } catch (error) {
      errors++;
      await prisma.importRowError.create({
        data: {
          jobId,
          rowNumber,
          reason: error instanceof Error ? error.message : "Unknown error",
          rawRowJson: rawRow,
        },
      });
    }
  }

  return { processed, errors };
}

