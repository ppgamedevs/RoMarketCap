"use client";

import { useState } from "react";
import { track } from "@/src/lib/analytics";

export function InlineNewsletterCapture({ lang }: { lang: "ro" | "en" }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, consent, hp, lang }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      setOk(true);
      track("NewsletterSubscribe", { placement: "inline" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <p className="text-sm font-medium">{lang === "ro" ? "Primește weekly movers" : "Get weekly movers"}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {lang === "ro" ? "Un email pe săptămână, fără spam." : "One email per week, no spam."}
      </p>
      <div className="hidden">
        <label>Do not fill</label>
        <input value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>
      {ok ? (
        <p className="mt-3 text-sm text-muted-foreground">{lang === "ro" ? "Trimis. Verifică inbox." : "Sent. Check your inbox."}</p>
      ) : (
        <div className="mt-3 grid gap-3">
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" />
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            {lang === "ro" ? "Sunt de acord să primesc emailuri." : "I agree to receive emails."}
          </label>
          <button className="inline-flex rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60" onClick={submit} disabled={loading} type="button">
            {loading ? "Loading..." : lang === "ro" ? "Abonează-te" : "Subscribe"}
          </button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      )}
    </div>
  );
}


