import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { updateCompanyRomcV1ById } from "@/src/lib/company/updateScore";
import { updateCompanyRomcAiById } from "@/src/lib/company/updateAiScore";
import { rateLimit } from "@/src/lib/ratelimit";
import { computePredV1 } from "@/src/lib/predictions/predV1";
import { Prisma } from "@prisma/client";
import { kv } from "@vercel/kv";
import { notifyCritical } from "@/src/lib/alerts/critical";
import { withLock } from "@/src/lib/locks/distributed";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  scope: z.string().optional(), // all | recent | industry:xxx | county:yyy
  limit: z.coerce.number().int().min(1).max(200).optional().default(200),
  dry: z.string().optional(),
});

function parseScope(scope: string | undefined) {
  if (!scope || scope === "recent") return { kind: "recent" as const };
  if (scope === "all") return { kind: "all" as const };
  const m1 = /^industry:(.+)$/.exec(scope);
  if (m1) return { kind: "industry" as const, value: m1[1]!.trim() };
  const m2 = /^county:(.+)$/.exec(scope);
  if (m2) return { kind: "county" as const, value: m2[1]!.trim() };
  return { kind: "recent" as const };
}

async function mapLimit<T, R>(items: T[], concurrency: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let idx = 0;
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i]!);
    }
  });
  await Promise.all(workers);
  return out;
}

async function upsertForecasts(companyId: string, now: Date) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      romcScore: true,
      romcConfidence: true,
      employees: true,
      revenueLatest: true,
      profitLatest: true,
      industrySlug: true,
      countySlug: true,
      lastScoredAt: true,
    },
  });
  if (!company?.romcScore || company.romcConfidence == null) return;

  const since = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 31 * 6);
  const history = await prisma.companyScoreHistory.findMany({
    where: { companyId, recordedAt: { gte: since } },
    orderBy: { recordedAt: "desc" },
    take: 6,
    select: { recordedAt: true, romcScore: true },
  });

  const forecasts = computePredV1({
    romcScore: company.romcScore,
    romcConfidence: company.romcConfidence,
    employees: company.employees ?? null,
    revenueLatest: company.revenueLatest ? Number(String(company.revenueLatest)) : null,
    profitLatest: company.profitLatest ? Number(String(company.profitLatest)) : null,
    industrySlug: company.industrySlug ?? null,
    countySlug: company.countySlug ?? null,
    lastScoredAt: company.lastScoredAt ?? null,
    history: history.map((h) => ({ recordedAt: h.recordedAt, romcScore: h.romcScore })),
  });

  for (const f of forecasts) {
    await prisma.companyForecast.upsert({
      where: { companyId_horizonDays_modelVersion: { companyId, horizonDays: f.horizonDays, modelVersion: "pred-v1" } },
      create: {
        companyId,
        computedAt: now,
        horizonDays: f.horizonDays,
        forecastScore: f.forecastScore,
        forecastConfidence: f.forecastConfidence,
        forecastBandLow: f.forecastBandLow,
        forecastBandHigh: f.forecastBandHigh,
        reasoning: f.reasoning as Prisma.InputJsonValue,
        modelVersion: "pred-v1",
      },
      update: {
        computedAt: now,
        forecastScore: f.forecastScore,
        forecastConfidence: f.forecastConfidence,
        forecastBandLow: f.forecastBandLow,
        forecastBandHigh: f.forecastBandHigh,
        reasoning: f.reasoning as Prisma.InputJsonValue,
      },
    });
  }
}

export async function GET(req: Request) {
  try {
    // Check feature flag
    const cronEnabled = await isFlagEnabled("CRON_RECALCULATE", true);
    if (!cronEnabled) {
      return NextResponse.json({ ok: false, error: "Recalculate cron is disabled via feature flag" }, { status: 503 });
    }

    const secret = process.env.CRON_SECRET;
    const got = req.headers.get("x-cron-secret");
    if (!secret || got !== secret) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const rl = await rateLimit(req, { kind: "anon" });
    if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });

    // Use distributed lock to prevent concurrent runs
    return await withLock("cron:recalculate", async () => {
      return await executeRecalculate(req, rl);
    }, { ttl: 1800 }); // 30 minutes max runtime
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({ route: "/api/cron/recalculate", message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeRecalculate(req: Request, rl: { headers: HeadersInit }) {

  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid query" }, { status: 400, headers: rl.headers });

  const scope = parseScope(parsed.data.scope);
  const limit = parsed.data.limit;
  const dry = parsed.data.dry === "1" || parsed.data.dry === "true";
  const now = new Date();
  const startedAt = Date.now();
  // Round to UTC day boundary so the job can be re-run safely (idempotent per day).
  const recordedAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const sevenDaysAgo = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7);

  const whereBase: Prisma.CompanyWhereInput = { isPublic: true, visibilityStatus: "PUBLIC" };
  if (scope.kind === "industry") whereBase.industrySlug = scope.value;
  if (scope.kind === "county") whereBase.countySlug = scope.value;

  const where: Prisma.CompanyWhereInput =
    scope.kind === "all"
      ? whereBase
      : {
          ...whereBase,
          OR: [{ lastScoredAt: null }, { lastScoredAt: { lt: sevenDaysAgo } }, { lastUpdatedAt: { gt: sevenDaysAgo } }],
        };

  const scopeKey =
    scope.kind === "industry" ? `industry:${scope.value}` : scope.kind === "county" ? `county:${scope.value}` : scope.kind;
  const cursorKey = `cron:recalc:cursor:${scopeKey}`;
  const cursor = (await kv.get<string>(cursorKey).catch(() => null)) ?? null;

  const companies = await prisma.company.findMany({
    where,
    orderBy: [{ id: "asc" }],
    take: limit,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: { id: true },
  });

  if (companies.length === 0) {
    await kv.del(cursorKey).catch(() => null);
    return NextResponse.json(
      { ok: true, processed: 0, errors: 0, dry, scope: scopeKey, cursor: null, durationMs: Date.now() - startedAt },
      { headers: rl.headers },
    );
  }

  const results = await mapLimit(companies, 5, async (c) => {
    try {
      if (!dry) {
        const res = await updateCompanyRomcV1ById(c.id, now);
        const updated = res?.company;
        if (updated) {
          const exists = await prisma.companyScoreHistory.findFirst({
            where: { companyId: updated.id, recordedAt, source: "cron" },
            select: { id: true },
          });
          if (!exists) {
            await prisma.companyScoreHistory.create({
              data: {
                companyId: updated.id,
                recordedAt,
                romcScore: updated.romcScore ?? 0,
                romcConfidence: updated.romcConfidence ?? 0,
                valuationRangeLow: updated.valuationRangeLow ? Number(String(updated.valuationRangeLow)) : null,
                valuationRangeHigh: updated.valuationRangeHigh ? Number(String(updated.valuationRangeHigh)) : null,
                employees: updated.employees ?? null,
                revenueLatest: updated.revenueLatest ? Number(String(updated.revenueLatest)) : null,
                profitLatest: updated.profitLatest ? Number(String(updated.profitLatest)) : null,
                source: "cron",
              },
            });
          }
        }

        await updateCompanyRomcAiById(c.id, now);
        const oldForecasts = await prisma.companyForecast.findMany({
          where: { companyId: c.id, modelVersion: "pred-v1" },
          select: { horizonDays: true, forecastScore: true },
        });
        await upsertForecasts(c.id, now);
        // Log forecast changes if significant
        const newForecasts = await prisma.companyForecast.findMany({
          where: { companyId: c.id, modelVersion: "pred-v1" },
          select: { horizonDays: true, forecastScore: true },
        });
        for (const nf of newForecasts) {
          const of = oldForecasts.find((f) => f.horizonDays === nf.horizonDays);
          if (of && Math.abs(nf.forecastScore - of.forecastScore) >= 2) {
            const { logCompanyChange } = await import("@/src/lib/changelog/logChange");
            const { CompanyChangeType } = await import("@prisma/client");
            await logCompanyChange({
              companyId: c.id,
              changeType: CompanyChangeType.FORECAST_CHANGE,
              metadata: {
                horizonDays: nf.horizonDays,
                oldScore: of.forecastScore,
                newScore: nf.forecastScore,
                delta: nf.forecastScore - of.forecastScore,
              },
            });
          }
        }
      }
      return { ok: true as const };
    } catch {
      return { ok: false as const };
    }
  });

  const processed = results.filter((r) => r.ok).length;
  const errors = results.length - processed;

  const nextCursor = companies[companies.length - 1]!.id;
  if (!dry) {
    if (companies.length < limit) await kv.del(cursorKey).catch(() => null);
    else await kv.set(cursorKey, nextCursor, { ex: 60 * 60 * 24 * 14 }).catch(() => null);
  }

  const payload = { ok: true, processed, errors, dry, scope: scopeKey, cursor: dry ? cursor : nextCursor, durationMs: Date.now() - startedAt };

  kv.set("cron:last:recalculate", JSON.stringify({ ...payload, ts: new Date().toISOString() }), { ex: 60 * 60 * 24 * 14 }).catch(() => null);

  return NextResponse.json(payload, { headers: rl.headers });
}


