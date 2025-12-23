import Link from "next/link";
import { LanguageToggle } from "@/components/layout/LanguageToggle";

export function CompanyHeader({
  locale,
  slug,
  name,
  city,
  county,
  industry,
  cui,
  website,
}: {
  locale: "ro" | "en";
  slug: string;
  name: string;
  city?: string | null;
  county?: string | null;
  industry?: string | null;
  cui?: string | null;
  website?: string | null;
}) {
  return (
    <header className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">
          <Link className="underline underline-offset-4" href={locale === "en" ? "/en/company" : "/company"}>
            {locale === "en" ? "Companies" : "Companii"}
          </Link>
        </p>
        <h1 className="mt-2 truncate text-2xl font-semibold tracking-tight">{name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {city ?? "N/A"}, {county ?? "N/A"} {industry ? `• ${industry}` : ""}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">CUI {cui ?? "N/A"}</p>
        {website ? (
          <a className="mt-2 inline-block text-sm underline underline-offset-4" href={website} target="_blank" rel="nofollow noopener noreferrer">
            {website}
          </a>
        ) : null}
      </div>
      <LanguageToggle locale={locale} slug={slug} />
    </header>
  );
}


