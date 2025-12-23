import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { getSiteUrl } from "@/lib/seo/site";
import { TrackWatchlistView } from "@/components/watchlist/TrackWatchlistView";
import { WatchlistSettingsPanel } from "@/components/watchlist/WatchlistSettings";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${getSiteUrl()}/watchlist`;
  return {
    title: "Watchlist - RoMarketCap",
    alternates: { canonical },
    robots: { index: false, follow: false },
  };
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export default async function WatchlistPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const sp = await searchParams;
  const industry = asString(sp.industry).trim();
  const county = asString(sp.county).trim();
  const sort = asString(sp.sort).trim() || "romc";

  const items = await prisma.watchlistItem.findMany({
    where: {
      userId: session.user.id,
      ...(industry ? { company: { industrySlug: industry } } : {}),
      ...(county ? { company: { countySlug: county } } : {}),
    },
    include: {
      company: {
        select: {
          id: true,
          slug: true,
          name: true,
          cui: true,
          industrySlug: true,
          countySlug: true,
          romcScore: true,
          romcAiScore: true,
          lastScoredAt: true,
        },
      },
    },
    orderBy:
      sort === "last"
        ? { company: { lastScoredAt: "desc" } }
        : sort === "ai"
          ? { company: { romcAiScore: "desc" } }
          : { company: { romcScore: "desc" } },
    take: 200,
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <TrackWatchlistView />
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Watchlist</h1>
          <p className="mt-1 text-sm text-muted-foreground">Saved companies for quick tracking.</p>
        </div>
        <Link href="/companies">
          <Button variant="outline" size="sm">Browse companies</Button>
        </Link>
      </header>

      <Card className="mt-6">
        <CardBody>
          <form className="grid gap-3 sm:grid-cols-3" action="/watchlist" method="get">
            <Input name="industry" placeholder="industry slug" defaultValue={industry} />
            <Input name="county" placeholder="county slug" defaultValue={county} />
            <Select name="sort" defaultValue={sort}>
              <option value="romc">Sort by ROMC</option>
              <option value="ai">Sort by ROMC AI</option>
              <option value="last">Sort by last scored</option>
            </Select>
            <div className="sm:col-span-3 flex items-center justify-between">
              <Button type="submit">Apply</Button>
              <Link href="/watchlist">
                <Button variant="ghost">Reset</Button>
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {items.length === 0 ? (
            <EmptyState
              title="No companies yet"
              description="Open a company page and click Add to Watchlist."
              action="Browse companies"
              href="/companies"
            />
          ) : (
            items.map((it) => (
              <Card key={it.id} asChild>
                <Link href={`/company/${it.company.slug}`} className="block hover:bg-accent transition-colors">
                  <CardBody>
                    <p className="text-sm font-medium">{it.company.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      CUI {it.company.cui ?? "N/A"} · {it.company.industrySlug ?? "N/A"} · {it.company.countySlug ?? "N/A"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      ROMC {it.company.romcScore ?? "N/A"} · AI {it.company.romcAiScore ?? "N/A"} · last{" "}
                      {it.company.lastScoredAt ? it.company.lastScoredAt.toISOString().slice(0, 10) : "N/A"}
                    </p>
                  </CardBody>
                </Link>
              </Card>
            ))
          )}
        </div>
        <WatchlistSettingsPanel />
      </div>
    </main>
  );
}


