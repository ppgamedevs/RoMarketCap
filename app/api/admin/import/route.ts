import { NextResponse } from "next/server";
import { z } from "zod";
import Papa from "papaparse";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { makeCompanySlug } from "@/src/lib/slug";
import { updateCompanyRomcV1ById } from "@/src/lib/company/updateScore";
import { slugifyTaxonomy } from "@/src/lib/slug";
import { logAdminAction } from "@/src/lib/audit/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  csv: z.string().min(1),
});

const RowSchema = z.object({
  cui: z.string().min(2),
  name: z.string().min(1),
  county: z.string().optional(),
  city: z.string().optional(),
  countySlug: z.string().optional(),
  industrySlug: z.string().optional(),
  caen: z.string().optional(),
  website: z.string().url().optional(),
  foundedYear: z.coerce.number().int().optional(),
  employees: z.coerce.number().int().optional(),
  revenueLatest: z.coerce.number().optional(),
  profitLatest: z.coerce.number().optional(),
  description: z.string().optional(),
});

function parseCsv(csv: string): unknown[] {
  const parsed = Papa.parse(csv, { header: true, skipEmptyLines: true });
  if (parsed.errors?.length) {
    throw new Error(parsed.errors[0]!.message);
  }
  return (parsed.data ?? []) as unknown[];
}

export async function POST(req: Request) {
  const session = await requireAdminSession();
  if (!session) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });

  let rows: unknown[];
  try {
    rows = parseCsv(parsed.data.csv);
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "CSV parse failed" }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  let failed = 0;

  const failures: Array<{ cui?: string; error: string }> = [];

  // Small-batch processing, safe for admin usage.
  for (const r of rows) {
    const row = RowSchema.safeParse(r);
    if (!row.success) {
      failed += 1;
      failures.push({ error: "Row validation failed" });
      continue;
    }

    const data = row.data;
    const cui = data.cui.trim();
    try {
      const existing = await prisma.company.findUnique({ where: { cui } });
      const slug = makeCompanySlug(data.name, cui);
      const countySlug = (data.countySlug ?? (data.county ? slugifyTaxonomy(data.county) : undefined)) || null;
      const industrySlug = (data.industrySlug ? slugifyTaxonomy(data.industrySlug) : null) || null;

      if (!existing) {
        const company = await prisma.company.create({
          data: {
            slug,
            name: data.name,
            legalName: data.name,
            cui,
            county: data.county ?? null,
            countySlug,
            city: data.city ?? null,
            caen: data.caen ?? null,
            caenCode: data.caen ?? null,
            industrySlug,
            website: data.website ?? null,
            descriptionRo: data.description ?? null,
            foundedYear: data.foundedYear ?? null,
            employees: data.employees ?? null,
            employeeCountEstimate: data.employees ?? null,
            revenueLatest: data.revenueLatest ?? null,
            profitLatest: data.profitLatest ?? null,
            currency: "RON",
            isPublic: true,
            visibilityStatus: "PUBLIC",
            sourceConfidence: 70,
          },
        });
        created += 1;
        await updateCompanyRomcV1ById(company.id);
      } else {
        const company = await prisma.company.update({
          where: { id: existing.id },
          data: {
            slug,
            name: data.name,
            county: data.county ?? existing.county,
            countySlug: countySlug ?? existing.countySlug,
            city: data.city ?? existing.city,
            caen: data.caen ?? existing.caen,
            caenCode: data.caen ?? existing.caenCode,
            industrySlug: industrySlug ?? existing.industrySlug,
            website: data.website ?? existing.website,
            descriptionRo: data.description ?? existing.descriptionRo,
            foundedYear: data.foundedYear ?? existing.foundedYear,
            employees: data.employees ?? existing.employees,
            employeeCountEstimate: data.employees ?? existing.employeeCountEstimate,
            revenueLatest: data.revenueLatest ?? existing.revenueLatest,
            profitLatest: data.profitLatest ?? existing.profitLatest,
          },
        });
        updated += 1;
        await updateCompanyRomcV1ById(company.id);
      }
    } catch (e) {
      failed += 1;
      failures.push({ cui, error: e instanceof Error ? e.message : "Import failed" });
    }
  }

  await logAdminAction({
    actorUserId: session.user.id,
    action: "company.import_csv",
    entityType: "Company",
    entityId: "batch",
    metadata: { created, updated, failed, rows: rows.length },
  });

  return NextResponse.json({ ok: true, created, updated, failed, failures });
}


