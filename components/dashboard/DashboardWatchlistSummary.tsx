import Link from "next/link";
import type { Lang } from "@/src/lib/i18n/shared";
import type { WatchlistItem, Company, CompanyForecast } from "@prisma/client";

type WatchlistItemWithCompany = WatchlistItem & {
  company: Pick<Company, "id" | "slug" | "name" | "cui" | "romcAiScore" | "romcScore" | "lastScoredAt">;
};


export function DashboardWatchlistSummary({
  lang,
  items,
  currentForecasts,
}: {
  lang: Lang;
  items: WatchlistItemWithCompany[];
  currentForecasts: Array<Pick<CompanyForecast, "companyId" | "forecastScore" | "computedAt">>;
}) {
  const forecastMap = new Map(
    currentForecasts.map((f) => [f.companyId, { forecastScore: f.forecastScore, computedAt: f.computedAt }]),
  );

  if (items.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-card-foreground">
        <h2 className="text-sm font-medium">{lang === "ro" ? "Watchlist" : "Watchlist"}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ro" ? "Nu ai companii în watchlist." : "No companies in watchlist."}
        </p>
        <Link className="mt-4 inline-flex rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" href="/companies">
          {lang === "ro" ? "Explorează companii" : "Explore companies"}
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h2 className="text-sm font-medium">{lang === "ro" ? "Watchlist (ultimele 20)" : "Watchlist (last 20)"}</h2>
      <div className="mt-4 space-y-3">
        {items.slice(0, 10).map((item) => {
          const forecast = forecastMap.get(item.company.id);
          const forecastDelta = forecast ? forecast.forecastScore - (item.company.romcScore ?? 0) : null;

          return (
            <div key={item.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div className="flex-1">
                <Link
                  href={`/company/${encodeURIComponent(item.company.slug)}`}
                  className="font-medium hover:underline"
                >
                  {item.company.name}
                </Link>
                <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                  <span>
                    ROMC AI: {item.company.romcAiScore != null ? `${item.company.romcAiScore}/100` : "N/A"}
                  </span>
                  {forecastDelta != null ? (
                    <span className={forecastDelta > 0 ? "text-green-600" : forecastDelta < 0 ? "text-red-600" : ""}>
                      30d forecast: {forecastDelta > 0 ? "+" : ""}
                      {forecastDelta.toFixed(1)}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {items.length > 10 ? (
        <Link
          className="mt-4 inline-flex text-sm text-muted-foreground underline underline-offset-4"
          href="/watchlist"
        >
          {lang === "ro" ? `Vezi toate ${items.length} companii` : `View all ${items.length} companies`}
        </Link>
      ) : null}
    </div>
  );
}

