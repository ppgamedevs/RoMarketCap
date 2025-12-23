import Link from "next/link";

export type LanguageToggleProps = {
  locale: "ro" | "en";
  slug: string;
};

export function LanguageToggle({ locale, slug }: LanguageToggleProps) {
  const otherLocale = locale === "ro" ? "en" : "ro";
  const href = otherLocale === "en" ? `/en/company/${slug}` : `/company/${slug}`;

  return (
    <Link className="text-sm underline underline-offset-4" href={href} prefetch={false}>
      {otherLocale.toUpperCase()}
    </Link>
  );
}


