import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { getSiteUrl } from "@/lib/seo/site";
import { getEffectiveDemoMode } from "@/src/lib/launch/mode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CHUNK_SIZE = 20_000;

function cacheHeaders() {
  return {
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    "Content-Type": "application/xml; charset=utf-8",
  };
}

export async function GET() {
  const base = getSiteUrl();
  const isDemoMode = getEffectiveDemoMode();
  const count = await prisma.company.count({
    where: {
      isPublic: true,
      visibilityStatus: "PUBLIC",
      ...(isDemoMode ? {} : { isDemo: false }),
    },
  });
  const chunks = Math.max(1, Math.ceil(count / CHUNK_SIZE));

  const now = new Date().toISOString().slice(0, 10);
  const sitemaps = [
    { loc: `${base}/sitemaps/static.xml`, lastmod: now },
    ...Array.from({ length: chunks }).map((_, i) => ({ loc: `${base}/sitemaps/companies-${i + 1}.xml`, lastmod: now })),
  ];

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    sitemaps.map((s) => `<sitemap><loc>${s.loc}</loc><lastmod>${s.lastmod}</lastmod></sitemap>`).join("") +
    `</sitemapindex>`;

  return new NextResponse(xml, { status: 200, headers: cacheHeaders() });
}


