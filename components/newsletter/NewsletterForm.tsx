"use client";

import { useState } from "react";
import { track } from "@/src/lib/analytics";

export function NewsletterForm({ lang }: { lang: "ro" | "en" }) {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, consent, hp, lang }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      track("NewsletterSubscribe", { source: "newsletter" });
      setMessage(lang === "ro" ? "Verifică emailul pentru confirmare." : "Check your email to confirm.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <div className="hidden">
        <label>Do not fill</label>
        <input value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>
      <label className="text-sm font-medium">{lang === "ro" ? "Email" : "Email"}</label>
      <input
        className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@domain.com"
        inputMode="email"
      />
      <label className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          {lang === "ro"
            ? "Sunt de acord să primesc emailuri despre ROMC Movers și semnale (poți dezabona oricând)."
            : "I agree to receive emails about ROMC Movers and signals (you can unsubscribe anytime)."}
        </span>
      </label>
      <button
        className="mt-4 inline-flex rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
        disabled={!consent || loading}
        onClick={onSubmit}
        type="button"
      >
        {loading ? "Loading..." : lang === "ro" ? "Get weekly ROMC Movers + signals" : "Get weekly ROMC Movers + signals"}
      </button>
      {message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}


