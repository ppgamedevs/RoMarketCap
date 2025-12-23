"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import type { Lang } from "@/src/lib/i18n";
import { t } from "@/src/lib/i18n/shared";

export function ClaimSubmitPanel({ lang, cui }: { lang: Lang; cui: string }) {
  const { status } = useSession();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hp, setHp] = useState("");

  const [website, setWebsite] = useState("");
  const [employees, setEmployees] = useState<string>("");
  const [revenueLatest, setRevenueLatest] = useState<string>("");
  const [profitLatest, setProfitLatest] = useState<string>("");
  const [currency, setCurrency] = useState<"RON" | "EUR">("RON");
  const [note, setNote] = useState("");

  const requireLogin = status !== "authenticated";

  const onClaim = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/company/${encodeURIComponent(cui)}/claim`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: "founder", hp }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      setMessage("OK");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = { currency };
      if (website.trim()) payload.website = website.trim();
      if (note.trim()) payload.note = note.trim();
      if (employees.trim()) payload.employees = Number(employees);
      if (revenueLatest.trim()) payload.revenueLatest = Number(revenueLatest);
      if (profitLatest.trim()) payload.profitLatest = Number(profitLatest);
      if (hp.trim()) payload.hp = hp.trim();

      const res = await fetch(`/api/company/${encodeURIComponent(cui)}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "bulk_update", payload }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      setMessage(t(lang, "submit_success"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h2 className="text-sm font-medium">{lang === "ro" ? "Trust" : "Trust"}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {lang === "ro"
          ? "Fondator? Revendică și deblochează vizibilitate mai bună după verificare. Investitor? Folosește Watchlist."
          : "Founder? Claim and unlock better visibility after verification. Investor? Use Watchlist."}
      </p>

      {requireLogin ? (
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{t(lang, "login_required")}</p>
          <Link className="mt-2 inline-flex rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground" href="/login">
            Login
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden">
            <label>Do not fill</label>
            <input value={hp} onChange={(e) => setHp(e.target.value)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              className="inline-flex rounded-md border px-3 py-2 text-sm disabled:opacity-60"
              onClick={onClaim}
              disabled={loading}
              type="button"
            >
              {t(lang, "claim_btn")}
            </button>
            <Link className="inline-flex rounded-md border px-3 py-2 text-sm" href="/watchlist">
              {lang === "ro" ? "Watchlist" : "Watchlist"}
            </Link>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-medium">{t(lang, "submit_update")}</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">Website</label>
                <input className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm" value={website} onChange={(e) => setWebsite(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Currency</label>
                <select
                  className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value === "EUR" ? "EUR" : "RON")}
                >
                  <option value="RON">RON</option>
                  <option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Employees</label>
                <input className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm" value={employees} onChange={(e) => setEmployees(e.target.value)} inputMode="numeric" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Revenue latest</label>
                <input className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm" value={revenueLatest} onChange={(e) => setRevenueLatest(e.target.value)} inputMode="decimal" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Profit latest</label>
                <input className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm" value={profitLatest} onChange={(e) => setProfitLatest(e.target.value)} inputMode="decimal" />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground">Note</label>
                <input className="mt-1 w-full rounded-md border bg-background px-2 py-2 text-sm" value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
            </div>
            <button
              className="mt-4 inline-flex rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
              onClick={onSubmit}
              disabled={loading}
              type="button"
            >
              {loading ? "Loading..." : t(lang, "submit_update")}
            </button>
          </div>
        </>
      )}

      {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}


