import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/src/lib/db";
import { getSiteUrl } from "@/lib/seo/site";
import { getLangFromRequest, t } from "@/src/lib/i18n";
import { TrackMoversView } from "@/components/analytics/TrackMoversView";
import { getPlacementsForLocation } from "@/src/lib/placements";
import { Placements } from "@/components/placements/Placements";
import { NewsletterCta } from "@/components/newsletter/NewsletterCta";
import { getOrSetPageCache, getLangForCache, isAdminForCache, PAGE_CACHE_TTLS } from "@/src/lib/cache/pageCache";
import { generateBreadcrumbJsonLd } from "@/src/lib/seo/breadcrumbs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Market Movers - RoMarketCap" : "Market Movers - RoMarketCap";
  const description =
    lang === "ro"
      ? "Cele mai mari creșteri și scăderi ale scorului ROMC în ultimele 30 de zile."
      : "Biggest ROMC score movers in the last 30 days.";
  const canonical = `${getSiteUrl()}/movers`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", title, description, url: canonical, images: [{ url: `${canonical}/opengraph-image` }] },
    twitter: { card: "summary_large_image", title, description, images: [`${canonical}/opengraph-image`] },
  };
}

type Mover = { slug: string; name: string; delta: number; from: number; to: number };

export default async function MoversPage() {
  const lang = await getLangFromRequest();
  const langForCache = await getLangForCache();
  const isAdmin = await isAdminForCache();
  const placements = await getPlacementsForLocation("movers", lang);
  const now = new Date();
  const since = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30);

  type CachedMoversData = {
    topUp: Mover[];
    topDown: Mover[];
    fallbackAi: Array<{ slug: string; name: string; romcAiScore: number | null }>;
    newlyScored: Array<{ slug: string; name: string; romcScore: number | null }>;
  };

  const computeMoversData = async (): Promise<CachedMoversData> => {
    const rows = await prisma.companyScoreHistory.findMany({
      where: { recordedAt: { gte: since } },
      select: { companyId: true, recordedAt: true, romcScore: true, company: { select: { slug: true, name: true } } },
      orderBy: { recordedAt: "asc" },
      take: 20_000,
    });

    const byCompany = new Map<
      string,
      { slug: string; name: string; first: { at: Date; score: number } | null; last: { at: Date; score: number } | null }
    >();

    for (const r of rows) {
      const cur =
        byCompany.get(r.companyId) ??
        { slug: r.company.slug, name: r.company.name, first: null, last: null };
      if (!cur.first || r.recordedAt < cur.first.at) cur.first = { at: r.recordedAt, score: r.romcScore };
      if (!cur.last || r.recordedAt > cur.last.at) cur.last = { at: r.recordedAt, score: r.romcScore };
      byCompany.set(r.companyId, cur);
    }

    const movers: Mover[] = Array.from(byCompany.values())
      .filter((x) => x.first && x.last)
      .map((x) => ({
        slug: x.slug,
        name: x.name,
        from: x.first!.score,
        to: x.last!.score,
        delta: x.last!.score - x.first!.score,
      }))
      .sort((a, b) => b.delta - a.delta);

    const topUp = movers.slice(0, 10);
    const topDown = movers.slice().reverse().slice(0, 10);

    // Fallbacks if history is sparse.
    const [fallbackAi, newlyScored] = await Promise.all([
      prisma.company.findMany({
        where: { isPublic: true, visibilityStatus: "PUBLIC", romcAiScore: { not: null } },
        orderBy: [{ romcAiScore: "desc" }],
        take: 10,
        select: { slug: true, name: true, romcAiScore: true },
      }),
      prisma.company.findMany({
        where: { isPublic: true, visibilityStatus: "PUBLIC", lastScoredAt: { gte: since } },
        orderBy: [{ lastScoredAt: "desc" }],
        take: 10,
        select: { slug: true, name: true, romcScore: true },
      }),
    ]);

    return { topUp, topDown, fallbackAi, newlyScored };
  };

  const { topUp, topDown, fallbackAi, newlyScored } = isAdmin
    ? await computeMoversData()
    : await getOrSetPageCache<CachedMoversData>({ page: "movers", lang: langForCache }, computeMoversData, PAGE_CACHE_TTLS.list);

  // ItemList schema: include both top increases and decreases (limit to reasonable number)
  const allMovers = [...topUp.slice(0, 10), ...topDown.slice(0, 10)];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    numberOfItems: allMovers.length,
    itemListElement: allMovers.map((m, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url: `${getSiteUrl()}/company/${encodeURIComponent(m.slug)}`,
      name: m.name,
    })),
  };

  const breadcrumbJsonLd = generateBreadcrumbJsonLd([
    { name: lang === "ro" ? "Acasă" : "Home", url: "/" },
    { name: lang === "ro" ? "Market Movers" : "Market Movers", url: "/movers" },
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <TrackMoversView />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lang === "ro" ? "Market Movers" : "Market Movers"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t(lang, "disclaimer")}</p>
        </div>
        <div className="flex gap-4 text-sm">
          <Link className="underline underline-offset-4" href="/digest">
            {lang === "ro" ? "Digest" : "Digest"}
          </Link>
          <Link className="underline underline-offset-4" href="/companies">
            {lang === "ro" ? "Director companii" : "Company directory"}
          </Link>
        </div>
      </header>

      <div className="mt-6">
        <Placements placements={placements} location="movers" showEmptyState />
      </div>

      <div className="mt-6">
        <NewsletterCta
          lang={lang}
          placement="movers"
          incentives={lang === "ro" ? ["Alertă timpurie despre companii noi", "Ranking-uri exclusive"] : ["Early alerts on new companies", "Exclusive rankings"]}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-6 text-card-foreground">
          <h2 className="text-sm font-medium">{lang === "ro" ? "Top creșteri (30 zile)" : "Top increases (30 days)"}</h2>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            {topUp.length === 0 ? (
              <p className="text-sm text-muted-foreground">N/A</p>
            ) : (
              topUp.map((m) => (
                <Link key={m.slug} className="flex items-center justify-between underline underline-offset-4" href={`/company/${m.slug}`}>
                  <span>{m.name}</span>
                  <span className="text-muted-foreground">
                    {m.delta.toFixed(1)} ({m.from.toFixed(1)}→{m.to.toFixed(1)})
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6 text-card-foreground">
          <h2 className="text-sm font-medium">{lang === "ro" ? "Top scăderi (30 zile)" : "Top decreases (30 days)"}</h2>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            {topDown.length === 0 ? (
              <p className="text-sm text-muted-foreground">N/A</p>
            ) : (
              topDown.map((m) => (
                <Link key={m.slug} className="flex items-center justify-between underline underline-offset-4" href={`/company/${m.slug}`}>
                  <span>{m.name}</span>
                  <span className="text-muted-foreground">
                    {m.delta.toFixed(1)} ({m.from.toFixed(1)}→{m.to.toFixed(1)})
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-6 text-card-foreground">
          <h2 className="text-sm font-medium">{lang === "ro" ? "Fallback: ROMC AI ridicat" : "Fallback: highest ROMC AI"}</h2>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            {fallbackAi.length === 0 ? (
              <p className="text-sm text-muted-foreground">N/A</p>
            ) : (
              fallbackAi.map((c) => (
                <Link key={c.slug} className="flex items-center justify-between underline underline-offset-4" href={`/company/${c.slug}`}>
                  <span>{c.name}</span>
                  <span className="text-muted-foreground">{c.romcAiScore}/100</span>
                </Link>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-6 text-card-foreground">
          <h2 className="text-sm font-medium">{lang === "ro" ? "Nou scorate în ultimele 30 zile" : "Newly scored in last 30 days"}</h2>
          <div className="mt-4 flex flex-col gap-2 text-sm">
            {newlyScored.length === 0 ? (
              <p className="text-sm text-muted-foreground">N/A</p>
            ) : (
              newlyScored.map((c) => (
                <Link key={c.slug} className="flex items-center justify-between underline underline-offset-4" href={`/company/${c.slug}`}>
                  <span>{c.name}</span>
                  <span className="text-muted-foreground">{c.romcScore ?? "N/A"}</span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}


