import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { getSiteUrl } from "@/lib/seo/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHUNK_SIZE = 20_000;

function cacheHeaders() {
  return {
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    "Content-Type": "application/xml; charset=utf-8",
  };
}

function urlset(urls: Array<{ loc: string; lastmod?: string }>, baseUrl?: string) {
  // Sitemap protocol requires at least one <url> element
  if (urls.length === 0) {
    // Return a minimal valid sitemap with the homepage
    const base = baseUrl || getSiteUrl();
    const now = new Date().toISOString().slice(0, 10);
    return `<?xml version="1.0" encoding="UTF-8"?>` + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${base}/</loc><lastmod>${now}</lastmod></url></urlset>`;
  }
  const items = urls
    .map((u) => `<url><loc>${u.loc}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`)
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?>` + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${items}</urlset>`;
}

type Ctx = { params: Promise<{ name: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { name } = await ctx.params;
  const base = getSiteUrl();

  if (name === "static.xml") {
    const { getEffectiveDemoMode } = await import("@/src/lib/launch/mode");
    const isDemoMode = getEffectiveDemoMode();
    
    let industries: Array<{ industrySlug: string | null; _count: { _all: number } }> = [];
    let counties: Array<{ countySlug: string | null; _count: { _all: number } }> = [];
    let digests: Array<{ weekStart: Date }> = [];
    
    try {
      // Use raw SQL as workaround if Prisma Client doesn't know about is_demo yet
      // This will work even if Prisma Client hasn't been regenerated
      const isDemoFilter = isDemoMode ? "" : "AND is_demo = false";
      
      const [industriesRaw, countiesRaw, digestsResult] = await Promise.all([
        prisma.$queryRawUnsafe<Array<{ industry_slug: string | null; _count: bigint }>>(`
          SELECT industry_slug, COUNT(*) as _count
          FROM companies
          WHERE is_public = true
            AND visibility_status = 'PUBLIC'
            AND industry_slug IS NOT NULL
            ${isDemoFilter}
          GROUP BY industry_slug
        `),
        prisma.$queryRawUnsafe<Array<{ county_slug: string | null; _count: bigint }>>(`
          SELECT county_slug, COUNT(*) as _count
          FROM companies
          WHERE is_public = true
            AND visibility_status = 'PUBLIC'
            AND county_slug IS NOT NULL
            ${isDemoFilter}
          GROUP BY county_slug
        `),
        prisma.weeklyDigestIssue.findMany({
          orderBy: { weekStart: "desc" },
          take: 20,
          select: { weekStart: true },
        }),
      ]);

      // Transform raw results to match expected format
      industries = industriesRaw.map((r) => ({
        industrySlug: r.industry_slug,
        _count: { _all: Number(r._count) },
      }));
      counties = countiesRaw.map((r) => ({
        countySlug: r.county_slug,
        _count: { _all: Number(r._count) },
      }));
      digests = digestsResult;
    } catch (error) {
      // Database error - continue with empty arrays
      console.error("[sitemap:static] Database error:", error);
    }

    // Filter industries/counties with at least MIN_COMPANIES_FOR_INDEX companies
    const MIN_COMPANIES_FOR_INDEX = 5;
    const validIndustries = industries.filter((x) => x.industrySlug && x._count._all >= MIN_COMPANIES_FOR_INDEX);
    const validCounties = counties.filter((x) => x.countySlug && x._count._all >= MIN_COMPANIES_FOR_INDEX);

    const now = new Date().toISOString().slice(0, 10);
    const urls = [
      { loc: `${base}/`, lastmod: now },
      { loc: `${base}/ro`, lastmod: now },
      { loc: `${base}/companies`, lastmod: now },
      { loc: `${base}/movers`, lastmod: now },
      { loc: `${base}/top`, lastmod: now },
      { loc: `${base}/new`, lastmod: now },
      { loc: `${base}/newsletter`, lastmod: now },
      { loc: `${base}/digest`, lastmod: now },
      { loc: `${base}/industries`, lastmod: now },
      { loc: `${base}/counties`, lastmod: now },
      { loc: `${base}/about`, lastmod: now },
      { loc: `${base}/pricing`, lastmod: now },
      { loc: `${base}/partners`, lastmod: now },
      { loc: `${base}/terms`, lastmod: now },
      { loc: `${base}/privacy`, lastmod: now },
      { loc: `${base}/disclaimer`, lastmod: now },
      { loc: `${base}/methodology`, lastmod: now },
      { loc: `${base}/api-docs`, lastmod: now },
      ...digests.map((d) => ({ loc: `${base}/digest/${d.weekStart.toISOString().slice(0, 10)}`, lastmod: d.weekStart.toISOString().slice(0, 10) })),
      ...validIndustries.map((x) => ({ loc: `${base}/industries/${encodeURIComponent(x.industrySlug as string)}`, lastmod: now })),
      ...validCounties.map((x) => ({ loc: `${base}/counties/${encodeURIComponent(x.countySlug as string)}`, lastmod: now })),
      // Programmatic SEO routes: /top/[industry] and /top/[county]
      ...validIndustries.map((x) => ({ loc: `${base}/top/${encodeURIComponent(x.industrySlug as string)}`, lastmod: now })),
      ...validCounties.map((x) => ({ loc: `${base}/top/${encodeURIComponent(x.countySlug as string)}`, lastmod: now })),
      // Programmatic SEO routes: /new/[industry] and /new/[county]
      ...validIndustries.map((x) => ({ loc: `${base}/new/${encodeURIComponent(x.industrySlug as string)}`, lastmod: now })),
      ...validCounties.map((x) => ({ loc: `${base}/new/${encodeURIComponent(x.countySlug as string)}`, lastmod: now })),
    ];
    return new NextResponse(urlset(urls, base), { status: 200, headers: cacheHeaders() });
  }

  const m = /^companies-(\d+)\.xml$/.exec(name);
  if (!m) return new NextResponse("Not found", { status: 404 });

  const chunk = Number(m[1]);
  if (!Number.isFinite(chunk) || chunk < 1) return new NextResponse("Not found", { status: 404 });

  const skip = (chunk - 1) * CHUNK_SIZE;
  // Exclude demo companies unless DEMO_MODE is enabled (and not in launch mode)
  const { getEffectiveDemoMode } = await import("@/src/lib/launch/mode");
  const isDemoMode = getEffectiveDemoMode();
  
  let companies: Array<{ slug: string; canonicalSlug: string | null; lastUpdatedAt: Date }> = [];
  try {
    // Use raw SQL as workaround if Prisma Client doesn't know about is_demo/canonical_slug yet
    const isDemoFilter = isDemoMode ? "" : "AND is_demo = false";
    const companiesRaw = await prisma.$queryRawUnsafe<Array<{
      slug: string;
      canonical_slug: string | null;
      last_updated_at: Date;
    }>>(`
      SELECT slug, canonical_slug, last_updated_at
      FROM companies
      WHERE is_public = true
        AND visibility_status = 'PUBLIC'
        ${isDemoFilter}
      ORDER BY slug ASC
      LIMIT ${CHUNK_SIZE}
      OFFSET ${skip}
    `);
    
    companies = companiesRaw.map((c) => ({
      slug: c.slug,
      canonicalSlug: c.canonical_slug,
      lastUpdatedAt: c.last_updated_at,
    }));
  } catch (error) {
    // Database error - return minimal valid sitemap with homepage
    console.error("[sitemap:companies] Database error:", error);
    const now = new Date().toISOString().slice(0, 10);
    return new NextResponse(urlset([{ loc: `${base}/`, lastmod: now }], base), { status: 200, headers: cacheHeaders() });
  }

  // Use canonicalSlug if available, otherwise slug. Deduplicate by canonical slug.
  const urlMap = new Map<string, { loc: string; lastmod: string }>();
  for (const c of companies) {
    const canonicalSlug = c.canonicalSlug ?? c.slug;
    const lastmod = c.lastUpdatedAt.toISOString().slice(0, 10);
    if (!urlMap.has(canonicalSlug)) {
      urlMap.set(canonicalSlug, { loc: `${base}/company/${encodeURIComponent(canonicalSlug)}`, lastmod });
    }
  }
  const urls = Array.from(urlMap.values());

  return new NextResponse(urlset(urls, base), { status: 200, headers: cacheHeaders() });
}


