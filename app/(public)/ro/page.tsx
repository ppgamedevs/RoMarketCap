import Link from "next/link";
import type { Metadata } from "next";
import { getDefaultMetadata } from "@/lib/seo/metadata";
import { prisma } from "@/src/lib/db";
import { getLangFromRequest, t } from "@/src/lib/i18n";

export const metadata: Metadata = getDefaultMetadata({ locale: "ro" });
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function RoHomePage() {
  const lang = await getLangFromRequest();
  
  let top: Array<{ id: string; company: { slug: string; name: string }; romcScore: number }> = [];
  
  try {
    const latest = await prisma.scoreSnapshot.findMany({
      where: { version: "romc_v0" },
      orderBy: [{ computedAt: "desc" }],
      take: 200,
      include: { company: { select: { slug: true, name: true } } },
    });

    // De-dup per company, then take top by score.
    const byCompany = new Map<string, (typeof latest)[number]>();
    for (const s of latest) {
      if (!byCompany.has(s.companyId)) byCompany.set(s.companyId, s);
    }
    top = Array.from(byCompany.values())
      .sort((a, b) => b.romcScore - a.romcScore)
      .slice(0, 10);
  } catch (error) {
    // Database connection error - show empty state
    console.error("[RoHomePage] Database error:", error);
    // Continue with empty top array - page will show "N/A"
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-1px)] max-w-3xl flex-col gap-6 px-6 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{t(lang, "hero_title")}</h1>
        <p className="text-sm text-muted-foreground leading-6">{t(lang, "hero_subtitle")}</p>
        <div className="mt-2 flex gap-3">
          <Link className="inline-flex rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" href="/companies">
            {t(lang, "cta_explore")}
          </Link>
          <Link className="inline-flex rounded-md border px-3 py-2 text-sm" href="/billing">
            {t(lang, "cta_upgrade")}
          </Link>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t(lang, "disclaimer")}</p>
      </header>

      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="text-sm font-medium">{lang === "ro" ? "Top companii" : "Top companies"}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(lang, "disclaimer")}</p>
        <div className="mt-4 flex flex-col gap-2 text-sm">
          {top.length === 0 ? (
            <span className="text-muted-foreground">N/A</span>
          ) : (
            top.map((s) => (
              <Link key={s.id} className="flex items-center justify-between underline underline-offset-4" href={`/company/${s.company.slug}`}>
                <span>{s.company.name}</span>
                <span className="text-muted-foreground">{s.romcScore}/100</span>
              </Link>
            ))
          )}
        </div>
      </section>

      <section className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="text-sm font-medium">{lang === "ro" ? "Browse" : "Browse"}</h2>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link className="underline underline-offset-4" href="/industries">
            {lang === "ro" ? "Industrii" : "Industries"}
          </Link>
          <Link className="underline underline-offset-4" href="/counties">
            {lang === "ro" ? "Județe" : "Counties"}
          </Link>
          <Link className="underline underline-offset-4" href="/companies">
            {lang === "ro" ? "Director companii" : "Company directory"}
          </Link>
          <Link className="underline underline-offset-4" href="/movers">
            {lang === "ro" ? "Market Movers" : "Market Movers"}
          </Link>
          <Link className="underline underline-offset-4" href="/digest">
            {lang === "ro" ? "Digest" : "Digest"}
          </Link>
          <Link className="underline underline-offset-4" href="/newsletter">
            {lang === "ro" ? "Newsletter" : "Newsletter"}
          </Link>
          <Link className="underline underline-offset-4" href="/partners">
            {lang === "ro" ? "Parteneri" : "Partners"}
          </Link>
        </div>
      </section>
    </main>
  );
}


