"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { track } from "@/src/lib/analytics";
import type { Lang } from "@/src/lib/i18n";

type InvestorCtasProps = {
  lang: Lang;
  isPremium: boolean;
  isAuthed: boolean;
};

export function InvestorCtas({ lang, isPremium, isAuthed }: InvestorCtasProps) {
  const handleWatchlistCta = () => {
    track("InvestorWatchlistCTA", { source: "investors_page" });
  };

  const handleDealflowCta = () => {
    track("InvestorDealflowCTA", { source: "investors_page" });
  };

  return (
    <Card>
      <CardHeader>
        <h2 className="text-sm font-medium">{lang === "ro" ? "Începe acum" : "Get started"}</h2>
      </CardHeader>
      <CardBody>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-medium">
              {lang === "ro" ? "Creează watchlist pentru investitori" : "Create investor watchlist"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "ro"
                ? "Urmărește companiile de interes și primește alertări când se schimbă scorurile sau apar semnale noi."
                : "Track companies of interest and receive alerts when scores change or new signals appear."}
            </p>
            {isAuthed ? (
              <Link href="/watchlist" onClick={handleWatchlistCta} className="mt-3 inline-block">
                <Button variant="outline" size="sm">
                  {lang === "ro" ? "Accesează watchlist" : "Go to watchlist"}
                </Button>
              </Link>
            ) : (
              <Link href="/login" onClick={handleWatchlistCta} className="mt-3 inline-block">
                <Button variant="outline" size="sm">
                  {lang === "ro" ? "Login pentru watchlist" : "Login for watchlist"}
                </Button>
              </Link>
            )}
          </div>

          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-medium">
              {lang === "ro" ? "Primește dealflow săptămânal" : "Get weekly dealflow"}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "ro"
                ? "Abonează-te la newsletter pentru dealflow românesc: companii noi, creșteri rapide, și oportunități."
                : "Subscribe to newsletter for Romanian dealflow: new companies, fast growth, and opportunities."}
            </p>
            <Link href="/newsletter" onClick={handleDealflowCta} className="mt-3 inline-block">
              <Button variant="outline" size="sm">
                {lang === "ro" ? "Abonează-te" : "Subscribe"}
              </Button>
            </Link>
          </div>
        </div>

        {!isPremium && (
          <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-medium">
              {lang === "ro" ? "Deblochează funcții avansate" : "Unlock advanced features"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "ro"
                ? "Premium oferă filtre avansate, forecast-uri, export-uri, și API access."
                : "Premium offers advanced filters, forecasts, exports, and API access."}
            </p>
            <Link href="/pricing" className="mt-3 inline-block">
              <Button size="sm">{lang === "ro" ? "Vezi prețuri Premium" : "See Premium pricing"}</Button>
            </Link>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

