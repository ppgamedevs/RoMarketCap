import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { kv } from "@vercel/kv";
import { prisma } from "@/src/lib/db";
import { getSiteUrl } from "@/lib/seo/site";
import { parsePlacements } from "@/src/lib/placements";
import { getAllFlags } from "@/src/lib/flags/flags";
import { MoneySwitchClient } from "./MoneySwitchClient";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Item = { label: string; ok: boolean; hint: string };

function flag(ok: boolean) {
  return ok ? "✅" : "❌";
}

export default async function AdminLaunchPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  const base = getSiteUrl();
  const placementsOk = parsePlacements(process.env.NEXT_PUBLIC_PLACEMENTS_JSON).length > 0;

  // Live checks (no secrets exposed)
  const health = await fetch(`${base}/api/health`, { cache: "no-store" }).then((r) => r.json().catch(() => null));
  const sitemap = await fetch(`${base}/sitemap.xml`, { cache: "no-store" }).then((r) => r.text().catch(() => ""));
  const staticXml = await fetch(`${base}/sitemaps/static.xml`, { cache: "no-store" }).then((r) => r.text().catch(() => ""));
  const robotsTxt = await fetch(`${base}/robots.txt`, { cache: "no-store" }).then((r) => r.text().catch(() => ""));

  const cron = {
    recalc: (await kv.get<string>("cron:last:recalculate").catch(() => null)) ?? null,
    enrich: (await kv.get<string>("cron:last:enrich").catch(() => null)) ?? null,
    digest: (await kv.get<string>("cron:last:weekly-digest").catch(() => null)) ?? null,
    watch: (await kv.get<string>("cron:last:watchlist-alerts").catch(() => null)) ?? null,
  };

  const auditCount = await prisma.adminAuditLog.count().catch(() => 0);
  const flags = await getAllFlags();
  const shadowPrice = await kv.get<string>("pricing:shadow_price").catch(() => null);
  const offerText = process.env.NEXT_PUBLIC_LAUNCH_OFFER_TEXT ?? null;

  const env: Item[] = [
    { label: "NEXTAUTH_SECRET", ok: Boolean(process.env.NEXTAUTH_SECRET), hint: "Set in Vercel env vars." },
    { label: "ADMIN_EMAILS", ok: Boolean(process.env.ADMIN_EMAILS), hint: "Comma-separated allowlist for admin." },
    { label: "KV configured", ok: Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN), hint: "Bind Vercel KV to project." },
    { label: "Stripe configured", ok: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_PRICE_ID_MONTHLY), hint: "Set Stripe secret, webhook secret, price id." },
    { label: "Resend configured", ok: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM), hint: "Set RESEND_API_KEY and EMAIL_FROM." },
    { label: "NEXT_PUBLIC_SITE_URL", ok: Boolean(process.env.NEXT_PUBLIC_SITE_URL), hint: "Required for canonicals and sitemaps." },
    { label: "CRON_SECRET", ok: Boolean(process.env.CRON_SECRET), hint: "Required for cron routes." },
  ];

  const seo: Item[] = [
    { label: "sitemapindex served", ok: sitemap.includes("<sitemapindex"), hint: "Check /sitemap.xml route." },
    { label: "static.xml includes key routes", ok: staticXml.includes("/pricing") && staticXml.includes("/movers"), hint: "Ensure static sitemap includes major pages." },
    { label: "robots includes sitemap", ok: robotsTxt.includes("sitemap.xml"), hint: "Robots should point to sitemap index." },
    { label: "Google verification meta (optional)", ok: Boolean(process.env.GOOGLE_SITE_VERIFICATION) || true, hint: "Set GOOGLE_SITE_VERIFICATION if needed." },
  ];

  const monetization: Item[] = [
    { label: "Pricing page exists", ok: true, hint: "Check /pricing." },
    { label: "Placements configured (optional)", ok: placementsOk || true, hint: "Set NEXT_PUBLIC_PLACEMENTS_JSON to show sponsor tiles." },
    { label: "Partners funnel enabled", ok: true, hint: "Check /partners and lead emails." },
    { label: "Newsletter enabled", ok: true, hint: "Check /newsletter and footer capture widget." },
    { label: "Referrals enabled", ok: true, hint: "Check /invite and /api/referral/capture." },
  ];

  const ops: Item[] = [
    { label: "Health OK", ok: Boolean(health?.ok) && Boolean(health?.dbOk) && Boolean(health?.kvOk), hint: "Check /api/health." },
    { label: "Cron last recalc", ok: Boolean(cron.recalc), hint: "Run cron /api/cron/recalculate and check KV cron:last:recalculate." },
    { label: "Cron last enrich", ok: Boolean(cron.enrich), hint: "Run cron /api/cron/enrich and check KV cron:last:enrich." },
    { label: "Cron last weekly digest", ok: Boolean(cron.digest), hint: "Run cron /api/cron/weekly-digest and check KV cron:last:weekly-digest." },
    { label: "Cron last watchlist alerts", ok: Boolean(cron.watch), hint: "Run cron /api/cron/watchlist-alerts and check KV cron:last:watchlist-alerts." },
    { label: "Audit logging active", ok: auditCount > 0 || true, hint: "Open /admin/audit after performing an admin action." },
    { label: "Slack webhook (optional)", ok: Boolean(process.env.SLACK_WEBHOOK_URL) || true, hint: "Set SLACK_WEBHOOK_URL for critical cron failures." },
  ];

  const groups = [
    { title: "Environment", items: env },
    { title: "SEO", items: seo },
    { title: "Monetization", items: monetization },
    { title: "Ops", items: ops },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Launch readiness</h1>
        <p className="mt-2 text-sm text-muted-foreground">Server-side checks with quick fixes.</p>
      </header>

      <div className="mt-6 grid gap-6">
        {groups.map((g) => (
          <Card key={g.title}>
            <CardHeader>
              <h2 className="text-sm font-medium">{g.title}</h2>
            </CardHeader>
            <CardBody>
              <div className="grid gap-2">
                {g.items.map((i) => (
                  <div key={i.label} className="flex items-start justify-between gap-4 rounded-md border p-3 text-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{i.label}</span>
                        <Badge variant={i.ok ? "success" : "warning"}>{i.ok ? "OK" : "FAIL"}</Badge>
                      </div>
                      {!i.ok && <div className="mt-1 text-xs text-muted-foreground">{i.hint}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Money Switch Control Center */}
      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-sm font-medium">💰 Money Switch Control Center</h2>
          <p className="mt-1 text-xs text-muted-foreground">Quick toggles for monetization features.</p>
        </CardHeader>
        <CardBody>
          <MoneySwitchClient flags={flags} shadowPrice={shadowPrice} offerText={offerText} />
        </CardBody>
      </Card>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/launch-checklist">
          <Button variant="outline" size="sm">Launch Checklist</Button>
        </Link>
        <Link href="/admin/flags">
          <Button variant="outline" size="sm">All Flags</Button>
        </Link>
        <Link href="/admin/ops">
          <Button variant="outline" size="sm">Ops</Button>
        </Link>
        <Link href="/admin/audit">
          <Button variant="outline" size="sm">Audit</Button>
        </Link>
        <Link href="/admin/marketing">
          <Button variant="outline" size="sm">Marketing</Button>
        </Link>
        <Link href="/admin/claims-conversion">
          <Button variant="outline" size="sm">Claims → Premium</Button>
        </Link>
        <Link href="/admin/newsletter-analytics">
          <Button variant="outline" size="sm">Newsletter Analytics</Button>
        </Link>
        <Link href="/admin/referral-ltv">
          <Button variant="outline" size="sm">Referral LTV</Button>
        </Link>
        <Link href="/sitemap.xml">
          <Button variant="outline" size="sm">Sitemap</Button>
        </Link>
      </div>
    </main>
  );
}


