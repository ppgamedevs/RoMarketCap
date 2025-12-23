import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { sendEmail } from "@/src/lib/email/resend";
import { getSiteUrl } from "@/lib/seo/site";
import { avgDeltaByKey, computeTopMovers, type CompanyDelta } from "@/src/lib/digest/computeWeeklyDigest";
import { notifyCritical } from "@/src/lib/alerts/critical";
import { acquireLockWithRetry } from "@/src/lib/locks/distributed";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function utcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function startOfWeekUtc(now: Date) {
  // ISO week start Monday.
  const day = now.getUTCDay(); // 0=Sun..6=Sat
  const delta = (day + 6) % 7; // days since Monday
  const start = utcDay(new Date(now.getTime() - delta * 86400000));
  return start;
}

export async function GET(req: Request) {
  try {
    // Check feature flag for newsletter sends
    const newsletterEnabled = await isFlagEnabled("NEWSLETTER_SENDS", true);
    if (!newsletterEnabled) {
      return NextResponse.json({ ok: false, error: "Newsletter sends are disabled via feature flag" }, { status: 503 });
    }

    const secret = process.env.CRON_SECRET;
    const got = req.headers.get("x-cron-secret");
    if (!secret || got !== secret) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const lockId = await acquireLockWithRetry("cron:weekly-digest", { ttl: 3600, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      return await executeWeeklyDigest();
    } finally {
      await import("@/src/lib/locks/distributed").then(({ releaseLock }) => releaseLock("cron:weekly-digest", lockId));
    }
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({ route: "/api/cron/weekly-digest", message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeWeeklyDigest() {
  const now = new Date();
  const weekStart = startOfWeekUtc(now);
  const weekEnd = new Date(weekStart.getTime() + 7 * 86400000);
  const weekKey = weekStart.toISOString().slice(0, 10);

  // Compute per company deltas using two points inside the week.
  const rows = (await prisma.$queryRaw<
    Array<{
      companyId: string;
      slug: string;
      name: string;
      industrySlug: string | null;
      countySlug: string | null;
      fromScore: number;
      toScore: number;
    }>
  >`
    WITH firsts AS (
      SELECT DISTINCT ON (h.company_id) h.company_id, h.romc_score AS from_score
      FROM company_score_history h
      WHERE h.recorded_at >= ${weekStart} AND h.recorded_at < ${weekEnd}
      ORDER BY h.company_id, h.recorded_at ASC
    ),
    lasts AS (
      SELECT DISTINCT ON (h.company_id) h.company_id, h.romc_score AS to_score
      FROM company_score_history h
      WHERE h.recorded_at >= ${weekStart} AND h.recorded_at < ${weekEnd}
      ORDER BY h.company_id, h.recorded_at DESC
    )
    SELECT c.id as "companyId", c.slug, c.name, c.industry_slug as "industrySlug", c.county_slug as "countySlug",
           f.from_score as "fromScore", l.to_score as "toScore"
    FROM companies c
    JOIN firsts f ON f.company_id = c.id
    JOIN lasts l ON l.company_id = c.id
    WHERE c.is_public = true AND c.visibility_status = 'PUBLIC'
  `) ?? [];

  const deltas: CompanyDelta[] = rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    industrySlug: r.industrySlug,
    countySlug: r.countySlug,
    fromScore: r.fromScore,
    toScore: r.toScore,
    delta: r.toScore - r.fromScore,
  }));

  const movers = computeTopMovers(deltas, 10);
  const topIndustries = avgDeltaByKey(deltas, "industrySlug", 5);
  const topCounties = avgDeltaByKey(deltas, "countySlug", 5);

  const subjectRo = `Weekly ROMC Movers (${weekKey})`;
  const subjectEn = `Weekly ROMC Movers (${weekKey})`;

  const issueUrl = `${getSiteUrl()}/digest/${weekKey}`;

  const htmlRo = `
    <h1>Weekly ROMC Movers</h1>
    <p>Săptămâna: ${weekKey}</p>
    <p><a href="${issueUrl}">Vezi versiunea web</a></p>
    <h2>Top creșteri</h2>
    <ul>${movers.topUp.map((m) => `<li><a href="${getSiteUrl()}/company/${encodeURIComponent(m.slug)}">${m.name}</a> (${m.delta.toFixed(1)})</li>`).join("")}</ul>
    <h2>Top scăderi</h2>
    <ul>${movers.topDown.map((m) => `<li><a href="${getSiteUrl()}/company/${encodeURIComponent(m.slug)}">${m.name}</a> (${m.delta.toFixed(1)})</li>`).join("")}</ul>
    <h2>Industrii în trend</h2>
    <ul>${topIndustries.map((x) => `<li><a href="${getSiteUrl()}/industries/${encodeURIComponent(x.slug)}">${x.slug}</a> (avg ${x.avgDelta.toFixed(2)})</li>`).join("")}</ul>
    <h2>Județe în trend</h2>
    <ul>${topCounties.map((x) => `<li><a href="${getSiteUrl()}/counties/${encodeURIComponent(x.slug)}">${x.slug}</a> (avg ${x.avgDelta.toFixed(2)})</li>`).join("")}</ul>
  `;
  const htmlEn = `
    <h1>Weekly ROMC Movers</h1>
    <p>Week: ${weekKey}</p>
    <p><a href="${issueUrl}">View web version</a></p>
    <h2>Top increases</h2>
    <ul>${movers.topUp.map((m) => `<li><a href="${getSiteUrl()}/company/${encodeURIComponent(m.slug)}">${m.name}</a> (${m.delta.toFixed(1)})</li>`).join("")}</ul>
    <h2>Top decreases</h2>
    <ul>${movers.topDown.map((m) => `<li><a href="${getSiteUrl()}/company/${encodeURIComponent(m.slug)}">${m.name}</a> (${m.delta.toFixed(1)})</li>`).join("")}</ul>
    <h2>Trending industries</h2>
    <ul>${topIndustries.map((x) => `<li><a href="${getSiteUrl()}/industries/${encodeURIComponent(x.slug)}">${x.slug}</a> (avg ${x.avgDelta.toFixed(2)})</li>`).join("")}</ul>
    <h2>Trending counties</h2>
    <ul>${topCounties.map((x) => `<li><a href="${getSiteUrl()}/counties/${encodeURIComponent(x.slug)}">${x.slug}</a> (avg ${x.avgDelta.toFixed(2)})</li>`).join("")}</ul>
  `;

  const issue = await prisma.weeklyDigestIssue.upsert({
    where: { weekStart },
    create: { weekStart, weekEnd, subjectRo, subjectEn, htmlRo, htmlEn },
    update: { subjectRo, subjectEn, htmlRo, htmlEn },
    select: { id: true },
  });

  const canSend = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const sentKey = `weekly-digest:sent:${weekKey}`;
  const alreadyDone = (await kv.get(sentKey).catch(() => null)) === "1";

  if (canSend && !alreadyDone) {
    const batchSize = 200;
    const cursorKey = `weekly-digest:cursor:${weekKey}`;
    const cursor = (await kv.get<string>(cursorKey).catch(() => null)) ?? null;

    const subs = await prisma.newsletterSubscriber.findMany({
      where: { status: "ACTIVE", confirmedAt: { not: null } },
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, email: true, lang: true },
    });

    for (const s of subs) {
      const idKey = `weekly-digest:sent:${weekKey}:${s.id}`;
      const already = (await kv.get(idKey).catch(() => null)) === "1";
      if (already) continue;
      const lang = s.lang === "en" ? "en" : "ro";
      await sendEmail({
        to: s.email,
        subject: lang === "en" ? subjectEn : subjectRo,
        text: `${issueUrl}`,
        html: lang === "en" ? htmlEn : htmlRo,
      });
      await kv.set(idKey, "1", { ex: 60 * 60 * 24 * 60 }).catch(() => null);
    }

    if (subs.length < batchSize) {
      await kv.set(sentKey, "1", { ex: 60 * 60 * 24 * 60 }).catch(() => null);
      await kv.del(cursorKey).catch(() => null);
    } else {
      await kv.set(cursorKey, subs[subs.length - 1]!.id, { ex: 60 * 60 * 24 * 14 }).catch(() => null);
    }
  }

  await kv.set("cron:last:weekly-digest", JSON.stringify({ weekKey, issueId: issue.id, ts: new Date().toISOString() }), { ex: 60 * 60 * 24 * 14 }).catch(() => null);

  return NextResponse.json({ ok: true, weekKey, issueId: issue.id, sendAttempted: canSend && !alreadyDone });
}


