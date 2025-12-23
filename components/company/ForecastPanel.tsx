"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/src/lib/i18n/shared";
import { t } from "@/src/lib/i18n/shared";
import { track } from "@/src/lib/analytics";

type ForecastRow = {
  horizonDays: number;
  forecastScore: number;
  forecastConfidence: number;
  forecastBandLow: number;
  forecastBandHigh: number;
  reasoning: unknown | null;
  computedAt: string;
};

type CompanySummary = {
  romcScore: number | null;
  romcConfidence: number | null;
  romcAiScore: number | null;
};

type State =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ok"; premium: boolean; company: CompanySummary; forecasts: ForecastRow[] };

function toCompanySummary(x: unknown): CompanySummary {
  const o = (x ?? {}) as Record<string, unknown>;
  const n = (v: unknown) => (typeof v === "number" ? v : null);
  return {
    romcScore: n(o.romcScore),
    romcConfidence: n(o.romcConfidence),
    romcAiScore: n(o.romcAiScore),
  };
}

export function ForecastPanel({ lang, cui }: { lang: Lang; cui: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const premium = state.kind === "ok" ? state.premium : null;

  useEffect(() => {
    let alive = true;
    fetch(`/api/company/${encodeURIComponent(cui)}/forecast`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (!res.ok) {
          setState({ kind: "error", message: json?.error ?? "Request failed" });
          return;
        }
        setState({
          kind: "ok",
          premium: Boolean(json?.premium),
          company: toCompanySummary(json?.company),
          forecasts: (json?.forecasts ?? []) as ForecastRow[],
        });
      })
      .catch((e) => {
        if (!alive) return;
        setState({ kind: "error", message: e instanceof Error ? e.message : "Request failed" });
      });
    return () => {
      alive = false;
    };
  }, [cui]);

  useEffect(() => {
    if (state.kind === "ok" && premium === false) track("PremiumPaywallShown", { cui, panel: "forecast" });
  }, [state.kind, premium, cui]);

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h2 className="text-sm font-medium">{lang === "ro" ? "Forecast" : "Forecast"}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{t(lang, "disclaimer")}</p>

      {state.kind === "loading" ? <p className="mt-3 text-sm text-muted-foreground">Loading...</p> : null}
      {state.kind === "error" ? (
        <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          <p className="font-medium">
            {lang === "ro" ? "Forecast temporar indisponibil" : "Forecast temporarily unavailable"}
          </p>
          <p className="mt-1 text-xs">
            {state.message === "Forecasts are currently disabled"
              ? lang === "ro"
                ? "Serviciul de forecast este temporar dezactivat pentru întreținere."
                : "The forecast service is temporarily disabled for maintenance."
              : state.message}
          </p>
        </div>
      ) : null}

      {state.kind === "ok" ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{t(lang, "romc_score")}</p>
              <p className="mt-1 text-lg font-semibold">{state.company.romcScore != null ? `${state.company.romcScore}/100` : "N/A"}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{lang === "ro" ? "ROMC AI" : "ROMC AI"}</p>
              <p className="mt-1 text-lg font-semibold">{state.company.romcAiScore != null ? `${state.company.romcAiScore}/100` : "N/A"}</p>
            </div>
            <div className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{t(lang, "confidence")}</p>
              <p className="mt-1 text-lg font-semibold">{state.company.romcConfidence != null ? `${state.company.romcConfidence}/100` : "N/A"}</p>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">{lang === "ro" ? "Orizont" : "Horizon"}</th>
                  <th className="py-2">{lang === "ro" ? "Scor" : "Score"}</th>
                  <th className="py-2">{lang === "ro" ? "Bandă" : "Band"}</th>
                  <th className="py-2">{lang === "ro" ? "Încredere" : "Confidence"}</th>
                </tr>
              </thead>
              <tbody>
                {state.forecasts.length === 0 ? (
                  <tr className="border-t">
                    <td className="py-2 text-muted-foreground" colSpan={4}>
                      N/A
                    </td>
                  </tr>
                ) : (
                  state.forecasts.map((f) => (
                    <tr key={f.horizonDays} className="border-t">
                      <td className="py-2">{f.horizonDays}d</td>
                      <td className="py-2 font-medium">{Math.round(f.forecastScore)}/100</td>
                      <td className="py-2 text-muted-foreground">
                        {Math.round(f.forecastBandLow)}-{Math.round(f.forecastBandHigh)}
                      </td>
                      <td className="py-2 text-muted-foreground">{Math.round(f.forecastConfidence)}/100</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!state.premium ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-md border bg-muted/50 p-3 text-xs">
                <p className="font-medium">{lang === "ro" ? "Preview (exemplu)" : "Preview (sample)"}</p>
                <p className="mt-1 text-muted-foreground">
                  {lang === "ro"
                    ? "Forecast 90d: +5% (bandă: +2% / +8%) • Forecast 180d: +12% (bandă: +8% / +16%)"
                    : "Forecast 90d: +5% (band: +2% / +8%) • Forecast 180d: +12% (band: +8% / +16%)"}
                </p>
                <p className="mt-1 text-muted-foreground">
                  {lang === "ro" ? "Upgrade pentru explicații detaliate și componente." : "Upgrade for detailed reasoning and components."}
                </p>
              </div>
              <div className="rounded-md border p-4">
                <p className="text-sm font-medium">{lang === "ro" ? "Forecast complet este Premium" : "Full forecast is Premium"}</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {lang === "ro" ? "Primești orizont 90/180 și explicația." : "Get 90/180 horizons and full reasoning."}
                </p>
                <Link className="mt-3 inline-flex rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" href="/billing">
                  {t(lang, "cta_upgrade")}
                </Link>
              </div>
            </div>
          ) : (
            <details className="mt-4 rounded-md border p-4">
              <summary className="cursor-pointer text-sm font-medium">{lang === "ro" ? "Cum este calculat" : "How it is computed"}</summary>
              <pre className="mt-3 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                {JSON.stringify(state.forecasts.map((f) => ({ horizonDays: f.horizonDays, reasoning: f.reasoning })), null, 2)}
              </pre>
            </details>
          )}
        </>
      ) : null}
    </div>
  );
}


