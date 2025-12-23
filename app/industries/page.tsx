import type { Metadata } from "next";
import Link from "next/link";
import { getLangFromRequest, t } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { listIndustrySlugsWithCounts } from "@/src/lib/db/companyQueries";
import { industryLabel, STARTER_INDUSTRIES } from "@/src/lib/taxonomy/industries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Industrii - RoMarketCap" : "Industries - RoMarketCap";
  const description =
    lang === "ro"
      ? "Top companii private din România, grupate pe industrii."
      : "Top private Romanian companies grouped by industry.";
  const canonical = `${getSiteUrl()}/industries`;
  return { title, description, alternates: { canonical }, openGraph: { type: "website", title, description, url: canonical } };
}

export default async function IndustriesIndexPage() {
  const lang = await getLangFromRequest();
  const rows = await listIndustrySlugsWithCounts();
  const countMap = new Map(rows.map((r) => [r.slug, r.count]));
  const list = STARTER_INDUSTRIES.map((i) => ({ slug: i.slug, count: countMap.get(i.slug) ?? 0 }))
    .concat(rows.filter((r) => !countMap.has(r.slug)))
    .sort((a, b) => b.count - a.count);

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{lang === "ro" ? "Industrii" : "Industries"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t(lang, "disclaimer")}</p>
        </div>
        <Link className="text-sm underline underline-offset-4" href="/companies">
          {lang === "ro" ? "Director companii" : "Company directory"}
        </Link>
      </header>

      <section className="mt-6 rounded-xl border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          {lang === "ro"
            ? "Pagini indexabile pentru trafic SEO, cu listă de companii și scor ROMC."
            : "Indexable SEO pages with company lists and ROMC scores."}
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {list.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              {lang === "ro" ? "Nu există companii încă. Încearcă directorul." : "No companies yet. Try the directory."}{" "}
              <Link className="underline underline-offset-4" href="/companies">
                {lang === "ro" ? "Director" : "Directory"}
              </Link>
            </div>
          ) : null}
          {list.map((r) => (
            <Link key={r.slug} className="rounded-md border px-3 py-2 text-sm hover:bg-accent" href={`/industries/${r.slug}`}>
              <span className="font-medium">{industryLabel(r.slug, lang)}</span>{" "}
              <span className="text-muted-foreground">({r.count})</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}


