import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { sendEmail } from "@/src/lib/email/resend";
import { getSiteUrl } from "@/lib/seo/site";
import { notifyCritical } from "@/src/lib/alerts/critical";
import { evaluateAlertRule, evaluateAlertRuleSync } from "@/src/lib/alerts/evaluateRule";
import { acquireLockWithRetry } from "@/src/lib/locks/distributed";
import { isFlagEnabled } from "@/src/lib/flags/flags";
import * as Sentry from "@sentry/nextjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function utcDay(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export async function GET(req: Request) {
  try {
    // Check feature flag
    const alertsEnabled = await isFlagEnabled("ALERTS", true);
    if (!alertsEnabled) {
      return NextResponse.json({ ok: false, error: "Alerts are disabled via feature flag" }, { status: 503 });
    }

    const secret = process.env.CRON_SECRET;
    const got = req.headers.get("x-cron-secret");
    if (!secret || got !== secret) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const lockId = await acquireLockWithRetry("cron:watchlist-alerts", { ttl: 1800, maxRetries: 0 });
    if (!lockId) {
      return NextResponse.json({ ok: false, message: "locked" }, { status: 202 });
    }

    try {
      return await executeWatchlistAlerts();
    } finally {
      await import("@/src/lib/locks/distributed").then(({ releaseLock }) => releaseLock("cron:watchlist-alerts", lockId));
    }
  } catch (error) {
    Sentry.captureException(error);
    await notifyCritical({ route: "/api/cron/watchlist-alerts", message: error instanceof Error ? error.message : "Unknown error" });
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

async function executeWatchlistAlerts() {
  const now = new Date();
  const today = utcDay(now).toISOString().slice(0, 10);
  const since = new Date(now.getTime() - 86400000 * 2);

  // Get users with either legacy scoreChangeAlerts OR custom alert rules
  const usersWithLegacyAlerts = await prisma.watchlistSettings.findMany({
    where: { scoreChangeAlerts: true, user: { isPremium: true } },
    select: { userId: true, user: { select: { email: true } } },
    take: 2000,
  });

  const usersWithCustomRules = await prisma.userAlertRule.findMany({
    where: { active: true, user: { isPremium: true } },
    select: { userId: true, user: { select: { email: true } } },
    distinct: ["userId"],
    take: 2000,
  });

  const allUserIds = new Set([
    ...usersWithLegacyAlerts.map((u) => u.userId),
    ...usersWithCustomRules.map((u) => u.userId),
  ]);

  const users = Array.from(allUserIds).map((userId) => {
    const legacy = usersWithLegacyAlerts.find((u) => u.userId === userId);
    const custom = usersWithCustomRules.find((u) => u.userId === userId);
    return {
      userId,
      email: legacy?.user.email ?? custom?.user.email ?? null,
      hasLegacyAlerts: legacy != null,
      hasCustomRules: custom != null,
    };
  });

  let sent = 0;
  let skipped = 0;

  for (const u of users) {
    if (!u.email) continue;
    const key = `watchlist-alerts:sent:${today}:${u.userId}`;
    const already = (await kv.get(key).catch(() => null)) === "1";
    if (already) {
      skipped += 1;
      continue;
    }

    const watched = await prisma.watchlistItem.findMany({
      where: { userId: u.userId },
      select: { companyId: true, company: { select: { slug: true, name: true } } },
      take: 200,
    });
    if (watched.length === 0) {
      skipped += 1;
      await kv.set(key, "1", { ex: 60 * 60 * 24 }).catch(() => null);
      continue;
    }

    const ids = watched.map((w) => w.companyId);

    // Legacy score change alerts
    const legacyChanges: Array<{ slug: string; name: string; delta: number }> = [];
    if (u.hasLegacyAlerts) {
      const history = await prisma.companyScoreHistory.findMany({
        where: { companyId: { in: ids }, recordedAt: { gte: since } },
        orderBy: [{ companyId: "asc" }, { recordedAt: "desc" }],
        select: { companyId: true, recordedAt: true, romcScore: true },
        take: 2000,
      });

      const latestByCompany = new Map<string, { latest: number; prev: number | null }>();
      for (const h of history) {
        const cur = latestByCompany.get(h.companyId);
        if (!cur) {
          latestByCompany.set(h.companyId, { latest: h.romcScore, prev: null });
        } else if (cur.prev == null) {
          cur.prev = h.romcScore;
        }
      }

      const changes = watched
        .map((w) => {
          const c = latestByCompany.get(w.companyId);
          if (!c || c.prev == null) return null;
          const delta = c.latest - c.prev;
          return { slug: w.company.slug, name: w.company.name, delta };
        })
        .filter((x): x is { slug: string; name: string; delta: number } => x != null)
        .filter((x) => Math.abs(x.delta) >= 5)
        .slice(0, 10);

      legacyChanges.push(...changes);
    }

    // Custom alert rules
    const customRuleMatches: Array<{ slug: string; name: string; ruleName: string }> = [];
    if (u.hasCustomRules) {
      const rules = await prisma.userAlertRule.findMany({
        where: { userId: u.userId, active: true },
        take: 50,
      });

      const companies = await prisma.company.findMany({
        where: { id: { in: ids } },
        select: {
          id: true,
          slug: true,
          name: true,
          romcAiScore: true,
          valuationRangeLow: true,
          valuationRangeHigh: true,
          companyIntegrityScore: true,
        },
      });

      for (const rule of rules) {
        let targetCompanies = companies;
        if (rule.scope === "COMPANY" && rule.companyId) {
          targetCompanies = companies.filter((c) => c.id === rule.companyId);
        } else if (rule.scope === "INDUSTRY" && rule.industrySlug) {
          const industryCompanies = await prisma.company.findMany({
            where: { industrySlug: rule.industrySlug, id: { in: ids } },
            select: {
              id: true,
              slug: true,
              name: true,
              romcAiScore: true,
              valuationRangeLow: true,
              valuationRangeHigh: true,
              companyIntegrityScore: true,
            },
            take: 100,
          });
          targetCompanies = industryCompanies;
        } else if (rule.scope === "COUNTY" && rule.countySlug) {
          const countyCompanies = await prisma.company.findMany({
            where: { countySlug: rule.countySlug, id: { in: ids } },
            select: {
              id: true,
              slug: true,
              name: true,
              romcAiScore: true,
              valuationRangeLow: true,
              valuationRangeHigh: true,
              companyIntegrityScore: true,
            },
            take: 100,
          });
          targetCompanies = countyCompanies;
        }

        for (const company of targetCompanies) {
          const companyData = {
            romcAiScore: company.romcAiScore,
            valuationRangeLow: company.valuationRangeLow ? Number(String(company.valuationRangeLow)) : null,
            valuationRangeHigh: company.valuationRangeHigh ? Number(String(company.valuationRangeHigh)) : null,
            companyIntegrityScore: company.companyIntegrityScore,
          };

          let matches = false;
          if (rule.operator === "PCT_CHANGE") {
            // Async evaluation for PCT_CHANGE
            matches = await evaluateAlertRule(rule, companyData, company.id);
          } else {
            // Sync evaluation for GT/LT
            matches = evaluateAlertRuleSync(rule, companyData);
          }

          if (matches) {
            customRuleMatches.push({ slug: company.slug, name: company.name, ruleName: rule.name });
          }
        }
      }
    }

    const allChanges = [...legacyChanges.map((c) => ({ type: "score_change" as const, ...c })), ...customRuleMatches.map((c) => ({ type: "rule_match" as const, ...c }))];

    if (allChanges.length === 0) {
      skipped += 1;
      await kv.set(key, "1", { ex: 60 * 60 * 24 }).catch(() => null);
      continue;
    }

    const html = `
      <h1>Watchlist alerts</h1>
      <p>Detected changes and rule matches.</p>
      <ul>
        ${allChanges
          .slice(0, 15)
          .map((c) => {
            if (c.type === "score_change") {
              return `<li><a href="${getSiteUrl()}/company/${encodeURIComponent(c.slug)}">${c.name}</a> (score change: ${c.delta.toFixed(1)})</li>`;
            } else {
              return `<li><a href="${getSiteUrl()}/company/${encodeURIComponent(c.slug)}">${c.name}</a> (rule: ${c.ruleName})</li>`;
            }
          })
          .join("")}
      </ul>
      <p><a href="${getSiteUrl()}/watchlist">Open watchlist</a></p>
      <p><a href="${getSiteUrl()}/dashboard/alerts">Manage alerts</a></p>
    `;

    if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) {
      await sendEmail({ to: u.email, subject: "Watchlist alerts", text: "Watchlist alerts", html });
      sent += 1;
    }
    await kv.set(key, "1", { ex: 60 * 60 * 24 }).catch(() => null);
    await kv.incr(`watchlist-alerts:count:${today}`).catch(() => null);
  }

  await kv.set("cron:last:watchlist-alerts", JSON.stringify({ ts: new Date().toISOString(), sent, skipped }), { ex: 60 * 60 * 24 * 14 }).catch(() => null);
  return NextResponse.json({ ok: true, sent, skipped });
}


