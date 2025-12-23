"use client";

import { useState } from "react";
import type { Lang } from "@/src/lib/i18n/shared";

export function CorrectionRequestForm({ lang, companyId, companyCui }: { lang: Lang; companyId?: string; companyCui?: string }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [hp, setHp] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/corrections/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name, message, companyId, companyCui, hp }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      setOk(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h2 className="text-sm font-medium">{lang === "ro" ? "Request correction" : "Request correction"}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {lang === "ro" ? "Trimite o corecție. Va fi revizuită." : "Submit a correction. It will be reviewed."}
      </p>

      <div className="hidden">
        <label>Do not fill</label>
        <input value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>

      {ok ? (
        <p className="mt-3 text-sm text-muted-foreground">{lang === "ro" ? "Trimis. Mulțumim." : "Sent. Thank you."}</p>
      ) : (
        <div className="mt-3 grid gap-3">
          <input className="rounded-md border bg-background px-3 py-2 text-sm" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" />
          <input
            className="rounded-md border bg-background px-3 py-2 text-sm"
            placeholder={lang === "ro" ? "Nume (opțional)" : "Name (optional)"}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm" placeholder={lang === "ro" ? "Mesaj" : "Message"} value={message} onChange={(e) => setMessage(e.target.value)} />
          <button className="inline-flex rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60" onClick={submit} disabled={loading} type="button">
            {loading ? "Loading..." : lang === "ro" ? "Trimite" : "Submit"}
          </button>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      )}
    </div>
  );
}


