import Link from "next/link";
import { prisma } from "@/src/lib/db";
import { redirect } from "next/navigation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CompanyIndexPage() {
  redirect("/companies");
  const companies = await prisma.company.findMany({
    select: { slug: true, name: true, city: true, county: true, industry: true, lastUpdatedAt: true },
    orderBy: { lastUpdatedAt: "desc" },
    take: 50,
  });

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Companii</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pagini publice indexabile. Estimările sunt orientative și nu reprezintă consultanță financiară.
          </p>
        </div>
        <Link className="text-sm underline underline-offset-4" href={`/lang?lang=en&next=${encodeURIComponent("/company")}`}>
          EN
        </Link>
      </header>

      <section className="mt-6 grid gap-3">
        {companies.map((c) => (
          <Link
            key={c.slug}
            href={`/company/${c.slug}`}
            className="rounded-xl border bg-card p-4 text-card-foreground hover:bg-accent"
          >
            <p className="text-sm font-medium">{c.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {(c.city ?? "N/A") + ", " + (c.county ?? "N/A")}
              {c.industry ? ` • ${c.industry}` : ""}
            </p>
          </Link>
        ))}
      </section>
    </main>
  );
}


