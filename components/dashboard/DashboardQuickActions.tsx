import Link from "next/link";
import type { Lang } from "@/src/lib/i18n/shared";

export function DashboardQuickActions({ lang, isPremium }: { lang: Lang; isPremium: boolean }) {
  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h2 className="text-sm font-medium">{lang === "ro" ? "Acțiuni rapide" : "Quick actions"}</h2>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link
          className="rounded-md border bg-background p-3 text-center text-sm transition-colors hover:bg-muted"
          href="/compare"
        >
          {lang === "ro" ? "Compară" : "Compare"}
        </Link>
        {isPremium ? (
          <Link
            className="rounded-md border bg-background p-3 text-center text-sm transition-colors hover:bg-muted"
            href="/dashboard/exports"
          >
            {lang === "ro" ? "Export" : "Export"}
          </Link>
        ) : (
          <Link
            className="rounded-md border bg-background p-3 text-center text-sm transition-colors hover:bg-muted"
            href="/pricing"
          >
            {lang === "ro" ? "Upgrade pentru export" : "Upgrade for export"}
          </Link>
        )}
        <Link
          className="rounded-md border bg-background p-3 text-center text-sm transition-colors hover:bg-muted"
          href="/dashboard/alerts"
        >
          {lang === "ro" ? "Alerte" : "Alerts"}
        </Link>
        <Link
          className="rounded-md border bg-background p-3 text-center text-sm transition-colors hover:bg-muted"
          href="/watchlist"
        >
          {lang === "ro" ? "Watchlist" : "Watchlist"}
        </Link>
      </div>
    </div>
  );
}

