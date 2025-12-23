import Link from "next/link";

export type RelatedCompany = {
  slug: string;
  name: string;
  romcScore: number | null;
};

export function RelatedCompanies({ lang, items }: { lang: "ro" | "en"; items: RelatedCompany[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h2 className="text-sm font-medium">{lang === "ro" ? "Related companies" : "Related companies"}</h2>
      <div className="mt-3 flex flex-col gap-2 text-sm">
        {items.map((c) => (
          <Link key={c.slug} className="flex items-center justify-between underline underline-offset-4" href={`/company/${encodeURIComponent(c.slug)}`}>
            <span>{c.name}</span>
            <span className="text-muted-foreground">{c.romcScore != null ? `${c.romcScore}/100` : "N/A"}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}


