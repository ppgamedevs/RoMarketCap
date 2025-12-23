"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LangToggle } from "@/components/layout/LangToggle";
import type { Lang } from "@/src/lib/i18n";
import { useMemo, useState, useTransition } from "react";
import clsx from "clsx";

const navItems: Array<{ href: string; key: string; label: { ro: string; en: string } }> = [
  { href: "/companies", key: "companies", label: { ro: "Companii", en: "Companies" } },
  { href: "/pricing", key: "pricing", label: { ro: "Prețuri", en: "Pricing" } },
  { href: "/movers", key: "movers", label: { ro: "Evoluții", en: "Movers" } },
  { href: "/billing", key: "billing", label: { ro: "Abonament", en: "Billing" } },
];

export function SiteHeader({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = useTransition();

  const activeKey = useMemo(() => {
    const match = navItems.find((n) => pathname?.startsWith(n.href));
    return match?.key ?? "";
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 md:px-6">
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Link href="/ro">RoMarketCap</Link>
          <span className="hidden text-xs text-muted-foreground sm:inline-block">/ Market intelligence</span>
        </div>

        <nav className="flex flex-1 items-center gap-1 text-sm">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={clsx(
                "rounded-md px-3 py-2 transition",
                activeKey === item.key ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-muted",
              )}
              aria-current={activeKey === item.key ? "page" : undefined}
            >
              {lang === "ro" ? item.label.ro : item.label.en}
            </Link>
          ))}
        </nav>

        <form
          className="hidden items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm shadow-sm md:flex"
          onSubmit={(e) => {
            e.preventDefault();
            startTransition(() => {
              router.push(`/companies?q=${encodeURIComponent(query)}`);
            });
          }}
          role="search"
        >
          <input
            aria-label={lang === "ro" ? "Caută companii" : "Search companies"}
            className="w-44 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder={lang === "ro" ? "Caută nume sau CUI" : "Search name or CUI"}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="text-xs text-muted-foreground hover:text-foreground" disabled={isPending}>
            {lang === "ro" ? "Caută" : "Search"}
          </button>
        </form>

        <LangToggle lang={lang} />
      </div>
    </header>
  );
}

