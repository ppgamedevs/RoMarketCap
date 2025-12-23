"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Lang } from "@/src/lib/i18n";

export function LangToggle({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const next = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ""}`;

  const target: Lang = lang === "en" ? "ro" : "en";

  return (
    <nav className="flex items-center gap-2 text-sm">
      <span className={lang === "ro" ? "font-medium" : "text-muted-foreground"}>RO</span>
      <span className="text-muted-foreground">/</span>
      <span className={lang === "en" ? "font-medium" : "text-muted-foreground"}>EN</span>
      <Link
        className="ml-3 rounded-md border px-2 py-1 text-xs"
        href={`/lang?lang=${target}&next=${encodeURIComponent(next)}`}
      >
        {target.toUpperCase()}
      </Link>
    </nav>
  );
}


