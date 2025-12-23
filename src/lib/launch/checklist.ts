import { kv } from "@vercel/kv";
import { prisma } from "@/src/lib/db";
import { getSiteUrl } from "@/lib/seo/site";
import { getAllFlags } from "@/src/lib/flags/flags";
import { listIndustrySlugsWithCounts, listCountySlugsWithCounts } from "@/src/lib/db/companyQueries";

export type ChecklistStatus = "PASS" | "WARN" | "FAIL";

export type ChecklistItem = {
  id: string;
  label: string;
  status: ChecklistStatus;
  hint: string;
  category: string;
};

export type ChecklistResult = {
  items: ChecklistItem[];
  summary: {
    total: number;
    pass: number;
    warn: number;
    fail: number;
  };
  actions: {
    canRunRecalc: boolean;
    canRunEnrich: boolean;
    canGenerateSnapshot: boolean;
    canSendTestEmail: boolean;
  };
};

const CRON_STALE_THRESHOLD_HOURS: Record<string, number> = {
  recalculate: 48,
  enrich: 12,
  "weekly-digest": 168 * 2, // 2 weeks
  "watchlist-alerts": 2,
  billing: 72,
  snapshot: 48,
};

export async function evaluateLaunchChecklist(): Promise<ChecklistResult> {
  const items: ChecklistItem[] = [];
  const base = getSiteUrl();

  // Environment Variables
  items.push({
    id: "env_nextauth_secret",
    label: "NEXTAUTH_SECRET configured",
    status: process.env.NEXTAUTH_SECRET ? "PASS" : "FAIL",
    hint: process.env.NEXTAUTH_SECRET ? "Secret is set" : "Set NEXTAUTH_SECRET in Vercel env vars",
    category: "Environment",
  });

  items.push({
    id: "env_admin_emails",
    label: "ADMIN_EMAILS configured",
    status: process.env.ADMIN_EMAILS ? "PASS" : "FAIL",
    hint: process.env.ADMIN_EMAILS ? "Admin allowlist is set" : "Set ADMIN_EMAILS (comma-separated)",
    category: "Environment",
  });

  items.push({
    id: "env_kv",
    label: "Vercel KV configured",
    status: process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ? "PASS" : "FAIL",
    hint: process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN ? "KV is bound" : "Bind Vercel KV to project",
    category: "Environment",
  });

  items.push({
    id: "env_stripe",
    label: "Stripe configured",
    status: process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRICE_ID_MONTHLY ? "PASS" : "WARN",
    hint: process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRICE_ID_MONTHLY ? "Stripe keys are set" : "Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_MONTHLY",
    category: "Environment",
  });

  items.push({
    id: "env_resend",
    label: "Resend configured",
    status: process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "PASS" : "WARN",
    hint: process.env.RESEND_API_KEY && process.env.EMAIL_FROM ? "Email service configured" : "Set RESEND_API_KEY and EMAIL_FROM",
    category: "Environment",
  });

  items.push({
    id: "env_site_url",
    label: "NEXT_PUBLIC_SITE_URL configured",
    status: process.env.NEXT_PUBLIC_SITE_URL ? "PASS" : "FAIL",
    hint: process.env.NEXT_PUBLIC_SITE_URL ? "Site URL is set" : "Set NEXT_PUBLIC_SITE_URL for canonicals and sitemaps",
    category: "Environment",
  });

  items.push({
    id: "env_cron_secret",
    label: "CRON_SECRET configured",
    status: process.env.CRON_SECRET ? "PASS" : "FAIL",
    hint: process.env.CRON_SECRET ? "Cron secret is set" : "Set CRON_SECRET for cron route protection",
    category: "Environment",
  });

  // Database & KV Health
  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    // dbOk stays false
  }
  items.push({
    id: "health_db",
    label: "Database connection",
    status: dbOk ? "PASS" : "FAIL",
    hint: dbOk ? "Database is reachable" : "Check DATABASE_URL and connection",
    category: "Health",
  });

  let kvOk = false;
  try {
    await kv.set("health:check", "1", { ex: 10 });
    const v = await kv.get("health:check");
    kvOk = v === "1";
    await kv.del("health:check").catch(() => null);
  } catch {
    // kvOk stays false
  }
  items.push({
    id: "health_kv",
    label: "KV read/write",
    status: kvOk ? "PASS" : "FAIL",
    hint: kvOk ? "KV is operational" : "Check KV_REST_API_URL and KV_REST_API_TOKEN",
    category: "Health",
  });

  // Cron Status
  const cronLastRuns: Record<string, string | null> = {};
  for (const [key] of Object.entries(CRON_STALE_THRESHOLD_HOURS)) {
    const lastRun = await kv.get<string>(`cron:last:${key}`).catch(() => null);
    cronLastRuns[key] = lastRun;
    const hoursSince = lastRun ? (Date.now() - new Date(lastRun).getTime()) / (1000 * 60 * 60) : Infinity;
    const threshold = CRON_STALE_THRESHOLD_HOURS[key]!;
    const status: ChecklistStatus = lastRun ? (hoursSince < threshold ? "PASS" : hoursSince < threshold * 2 ? "WARN" : "FAIL") : "FAIL";
    items.push({
      id: `cron_${key}`,
      label: `Cron: ${key} last run`,
      status,
      hint: lastRun
        ? `Last run: ${new Date(lastRun).toLocaleString()} (${Math.round(hoursSince)}h ago)`
        : `Cron has not run. Expected interval: ${threshold}h`,
      category: "Cron",
    });
  }

  // Sitemaps
  try {
    const sitemapRes = await fetch(`${base}/sitemap.xml`, { cache: "no-store" });
    const sitemapText = await sitemapRes.text();
    const hasSitemapIndex = sitemapText.includes("<sitemapindex");
    items.push({
      id: "sitemap_index",
      label: "Sitemap index accessible",
      status: hasSitemapIndex && sitemapRes.ok ? "PASS" : "FAIL",
      hint: hasSitemapIndex && sitemapRes.ok ? "Sitemap index is served" : "Check /sitemap.xml route",
      category: "SEO",
    });

    const staticRes = await fetch(`${base}/sitemaps/static.xml`, { cache: "no-store" }).catch(() => null);
    const staticOk = staticRes?.ok ?? false;
    items.push({
      id: "sitemap_static",
      label: "Static sitemap accessible",
      status: staticOk ? "PASS" : "WARN",
      hint: staticOk ? "Static sitemap is served" : "Check /sitemaps/static.xml route",
      category: "SEO",
    });
  } catch (error) {
    items.push({
      id: "sitemap_check",
      label: "Sitemap check",
      status: "FAIL",
      hint: `Error checking sitemaps: ${error instanceof Error ? error.message : "Unknown"}`,
      category: "SEO",
    });
  }

  // Robots.txt
  try {
    const robotsRes = await fetch(`${base}/robots.txt`, { cache: "no-store" });
    const robotsText = await robotsRes.text();
    const hasSitemap = robotsText.includes("sitemap.xml");
    items.push({
      id: "robots_txt",
      label: "Robots.txt includes sitemap",
      status: hasSitemap && robotsRes.ok ? "PASS" : "WARN",
      hint: hasSitemap && robotsRes.ok ? "Robots.txt is correct" : "Ensure robots.txt points to sitemap.xml",
      category: "SEO",
    });
  } catch {
    items.push({
      id: "robots_txt",
      label: "Robots.txt check",
      status: "WARN",
      hint: "Could not fetch robots.txt",
      category: "SEO",
    });
  }

  // Feature Flags
  const flags = await getAllFlags();
  const recommendedFlags: Record<string, boolean> = {
    PREMIUM_PAYWALLS: true,
    FORECASTS: true,
    ENRICHMENT: true,
    ALERTS: true,
    PLACEMENTS: true,
    API_ACCESS: true,
    NEWSLETTER_SENDS: true,
    READ_ONLY_MODE: false,
  };
  for (const [flag, recommended] of Object.entries(recommendedFlags)) {
    const current = flags[flag as keyof typeof flags];
    const status: ChecklistStatus = current === recommended ? "PASS" : "WARN";
    items.push({
      id: `flag_${flag.toLowerCase()}`,
      label: `Flag: ${flag}`,
      status,
      hint: current === recommended ? `Flag is ${current ? "enabled" : "disabled"} (recommended)` : `Flag is ${current ? "enabled" : "disabled"} (recommended: ${recommended ? "enabled" : "disabled"})`,
      category: "Feature Flags",
    });
  }

  // Data Quality
  const companyCount = await prisma.company.count({ where: { isDemo: false } });
  items.push({
    id: "data_company_count",
    label: "Company count (non-demo)",
    status: companyCount >= 10 ? (companyCount >= 100 ? "PASS" : "WARN") : "FAIL",
    hint: `Found ${companyCount} companies. Minimum: 10, Recommended: 100+`,
    category: "Data",
  });

  const [industries, counties] = await Promise.all([listIndustrySlugsWithCounts(), listCountySlugsWithCounts()]);
  items.push({
    id: "data_industries",
    label: "Industry coverage",
    status: industries.length >= 5 ? "PASS" : "WARN",
    hint: `Found ${industries.length} industries. Recommended: 5+`,
    category: "Data",
  });

  items.push({
    id: "data_counties",
    label: "County coverage",
    status: counties.length >= 5 ? "PASS" : "WARN",
    hint: `Found ${counties.length} counties. Recommended: 5+`,
    category: "Data",
  });

  // Movers list
  const moversCount = await prisma.company.count({
    where: {
      isDemo: false,
      romcAiScore: { not: null },
      romcAiScoreDelta: { not: null },
    },
    take: 1,
  });
  items.push({
    id: "data_movers",
    label: "Movers data available",
    status: moversCount > 0 ? "PASS" : "WARN",
    hint: moversCount > 0 ? "Movers list has data" : "Run recalculate cron to populate movers",
    category: "Data",
  });

  // Billing
  const premiumUserCount = await prisma.user.count({ where: { isPremium: true } });
  const billingStats = await kv.get<string>("cron:stats:billing").catch(() => null);
  const billingStatsParsed = billingStats ? JSON.parse(billingStats) : null;
  const billingDegraded = billingStatsParsed?.errors > 0;
  items.push({
    id: "billing_premium_users",
    label: "Premium users",
    status: premiumUserCount >= 0 ? "PASS" : "PASS", // Always pass, just informational
    hint: `Found ${premiumUserCount} premium users`,
    category: "Billing",
  });

  items.push({
    id: "billing_health",
    label: "Billing reconciliation health",
    status: !billingDegraded ? "PASS" : "WARN",
    hint: billingDegraded ? "Billing reconciliation has errors" : "Billing is healthy",
    category: "Billing",
  });

  // Summary
  const summary = {
    total: items.length,
    pass: items.filter((i) => i.status === "PASS").length,
    warn: items.filter((i) => i.status === "WARN").length,
    fail: items.filter((i) => i.status === "FAIL").length,
  };

  // Actions availability
  const actions = {
    canRunRecalc: Boolean(process.env.CRON_SECRET),
    canRunEnrich: Boolean(process.env.CRON_SECRET),
    canGenerateSnapshot: Boolean(process.env.CRON_SECRET),
    canSendTestEmail: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM && process.env.ADMIN_EMAILS),
  };

  return { items, summary, actions };
}
