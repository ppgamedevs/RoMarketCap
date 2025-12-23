"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Lang } from "@/src/lib/i18n";
import { t } from "@/src/lib/i18n/shared";
import { track } from "@/src/lib/analytics";

type State =
  | { kind: "loading" }
  | { kind: "locked"; status: number }
  | { kind: "ok"; payload: unknown }
  | { kind: "error"; message: string };

export function PremiumPanel({ lang, cui }: { lang: Lang; cui: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });

  useEffect(() => {
    let alive = true;
    fetch(`/api/company/${encodeURIComponent(cui)}/premium`)
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!alive) return;
        if (res.status === 401 || res.status === 402) {
          setState({ kind: "locked", status: res.status });
          return;
        }
        if (!res.ok) {
          setState({ kind: "error", message: json?.error ?? "Request failed" });
          return;
        }
        setState({ kind: "ok", payload: json });
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
    if (state.kind === "locked") track("PremiumPaywallShown", { cui, panel: "premium" });
  }, [state.kind, cui]);

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h2 className="text-sm font-medium">{t(lang, "premium_title")}</h2>

      {state.kind === "loading" ? <p className="mt-2 text-sm text-muted-foreground">Loading...</p> : null}

      {state.kind === "locked" ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{t(lang, "premium_locked")}</p>
          {/* Teaser data */}
          <div className="mt-4 rounded-md border bg-muted/50 p-3 text-xs">
            <p className="font-medium">{lang === "ro" ? "Preview (exemplu)" : "Preview (sample)"}</p>
            <p className="mt-1 text-muted-foreground">
              {lang === "ro"
                ? "Valuation estimată: €500K - €2M • Forecast 90d: +5% • Componente: Growth 75, Risk 25"
                : "Estimated valuation: €500K - €2M • Forecast 90d: +5% • Components: Growth 75, Risk 25"}
            </p>
            <p className="mt-1 text-muted-foreground">
              {lang === "ro" ? "Upgrade pentru date complete și explicații detaliate." : "Upgrade for full data and detailed explanations."}
            </p>
          </div>
          <div className="mt-4">
            <Link
              className="inline-flex rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
              href="/billing"
              onClick={() => track("PremiumClick", { cui })}
            >
              {t(lang, "cta_upgrade")}
            </Link>
          </div>
          <div className="sticky bottom-0 mt-4 rounded-md border bg-background/95 p-4 backdrop-blur">
            <p className="text-sm font-medium">{lang === "ro" ? "Deblochează Premium" : "Unlock Premium"}</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
              <li>{lang === "ro" ? "Forecast 90/180 zile" : "Forecast 90/180 days"}</li>
              <li>{lang === "ro" ? "Explicații și componente" : "Reasoning and components"}</li>
              <li>{lang === "ro" ? "Semnale timpurii (coming soon)" : "Early signals (coming soon)"}</li>
            </ul>
            <Link
              className="mt-3 inline-flex rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
              href="/billing"
              onClick={() => track("PremiumClick", { cui, location: "PremiumPanelSticky" })}
            >
              {t(lang, "cta_upgrade")}
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-sm font-medium">{t(lang, "premium_benefits_title")}</p>
            <ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
              <li>{t(lang, "premium_b1")}</li>
              <li>{t(lang, "premium_b2")}</li>
              <li>{t(lang, "premium_b3")}</li>
            </ul>
          </div>
        </>
      ) : null}

      {state.kind === "ok" ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">{t(lang, "premium_active")}</p>
          <button className="mt-4 inline-flex rounded-md border px-3 py-2 text-sm opacity-60" disabled type="button">
            Download report (coming soon)
          </button>
          <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(state.payload, null, 2)}</pre>
        </>
      ) : null}

      {state.kind === "error" ? <p className="mt-2 text-sm text-destructive">{state.message}</p> : null}
    </div>
  );
}


