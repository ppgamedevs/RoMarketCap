import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { enrichCompany } from "@/src/lib/enrichment/enrichCompany";
import { updateCompanyEnrichmentById } from "@/src/lib/company/updateEnrichment";
import { notifyCritical } from "@/src/lib/alerts/critical";
import { acquireLockWithRetry } from "@/src/lib/locks/distributed";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
  dry: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("CRON_ENRICH", true);
    if (!cronEnabled) {
      return NextResponse.json({ ok: false, error: "Enrichment cron is disabled via feature flag" }, { status: 503 });
    }

    const secret = process.env.CRON_SECRET;
    const got = req.headers.get("x-cron-secret");
    if (!secret || got !== secret) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    // Check for lock
    const lockId = await acquireLockWithRetry("cron:enrich", { ttl: 1800, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      return await executeEnrich(req);
    } finally {
      await import("@/src/lib/locks/distributed").then(({ releaseLock }) => releaseLock("cron:enrich", lockId));
    }
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({ route: "/api/cron/enrich", message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeEnrich(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400 });

  const dry = parsed.data.dry === "1" || parsed.data.dry === "true";
  const limit = parsed.data.limit;
  const now = new Date();

  const cursorKey = "cron:cursor:enrich";
  const cursor = (await kv.get<string>(cursorKey).catch(() => null)) ?? null;

  const companies = await prisma.company.findMany({
    where: { website: { not: null } },
    orderBy: { id: "asc" },
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true, website: true },
  });

  let processed = 0;
  let updated = 0;
  let errors = 0;

  for (const c of companies) {
    processed += 1;
    try {
      const out = await enrichCompany({ id: c.id, website: c.website ?? null });
      if (!dry) {
        const saved = await updateCompanyEnrichmentById(c.id, out.patch, now);
        if (saved.updated) updated += 1;
      }
    } catch {
      errors += 1;
      console.error("[cron:enrich] company_failed", { companyId: c.id });
    }
  }

  const nextCursor = companies.length ? companies[companies.length - 1]!.id : null;
  if (!dry) {
    if (companies.length < limit) await kv.del(cursorKey).catch(() => null);
    else if (nextCursor) await kv.set(cursorKey, nextCursor, { ex: 60 * 60 * 24 * 14 }).catch(() => null);
    await kv.set("cron:last:enrich", new Date().toISOString(), { ex: 60 * 60 * 24 * 14 }).catch(() => null);
    await kv.set("cron:stats:enrich", JSON.stringify({ processed, updated, errors, ts: new Date().toISOString() }), {
      ex: 60 * 60 * 24 * 14,
    }).catch(() => null);
  }

  return NextResponse.json({ ok: true, processed, updated, errors, dry, cursor: nextCursor });
}


