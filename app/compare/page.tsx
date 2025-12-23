import type { Metadata } from "next";
import { prisma } from "@/src/lib/db";
import { getSiteUrl } from "@/lib/seo/site";
import { getLangFromRequest, t } from "@/src/lib/i18n";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${getSiteUrl()}/compare`;
  return { title: "Compare - RoMarketCap", alternates: { canonical }, robots: { index: false, follow: false } };
}

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

export default async function ComparePage({ searchParams }: { searchParams: SearchParams }) {
  const lang = await getLangFromRequest();
  const sp = await searchParams;
  const cuis = asArray(sp.cui).map((x) => x.trim()).filter(Boolean).slice(0, 4);

  const companies = cuis.length
    ? await prisma.company.findMany({
        where: { cui: { in: cuis }, isPublic: true, visibilityStatus: "PUBLIC" },
        select: { slug: true, name: true, cui: true, romcScore: true, romcAiScore: true, romcConfidence: true, valuationRangeLow: true, valuationRangeHigh: true },
      })
    : [];

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">{lang === "ro" ? "Compară" : "Compare"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t(lang, "disclaimer")}</p>

      <div className="mt-6 rounded-xl border bg-card p-6">
        {companies.length === 0 ? (
          <p className="text-sm text-muted-foreground">Provide ?cui=...&cui=...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Company</th>
                  <th className="py-2">ROMC</th>
                  <th className="py-2">ROMC AI</th>
                  <th className="py-2">Confidence</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr key={c.slug} className="border-t">
                    <td className="py-2">
                      {c.name} {c.cui ? <span className="text-xs text-muted-foreground">(CUI {c.cui})</span> : null}
                    </td>
                    <td className="py-2">{c.romcScore ?? "N/A"}</td>
                    <td className="py-2">{c.romcAiScore ?? "N/A"}</td>
                    <td className="py-2">{c.romcConfidence ?? "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}


