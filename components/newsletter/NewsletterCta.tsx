"use client";

import { useState } from "react";
import { track } from "@/src/lib/analytics";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/src/lib/i18n";

type NewsletterCtaProps = {
  lang: Lang;
  placement: "rankings" | "digest" | "movers" | "footer" | "inline";
  incentives?: string[];
};

export function NewsletterCta({ lang, placement, incentives = [] }: NewsletterCtaProps) {
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
      track("NewsletterSubscribe", { placement, incentives: incentives.join(",") });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const defaultIncentives =
    lang === "ro"
      ? ["Ranking-uri exclusive", "Alertă timpurie despre companii noi"]
      : ["Exclusive rankings", "Early alerts on new companies"];

  const displayIncentives = incentives.length > 0 ? incentives : defaultIncentives;

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardBody className="p-4">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">
              {lang === "ro" ? "Abonează-te la newsletter" : "Subscribe to newsletter"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lang === "ro"
                ? "Primește dealflow românesc direct în inbox."
                : "Get Romanian dealflow directly in your inbox."}
            </p>
          </div>

          {displayIncentives.length > 0 && (
            <ul className="space-y-1 text-xs text-muted-foreground">
              {displayIncentives.map((inc, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span>✓</span>
                  <span>{inc}</span>
                </li>
              ))}
            </ul>
          )}

          {ok ? (
            <p className="text-sm text-muted-foreground">
              {lang === "ro" ? "Trimis. Verifică inbox." : "Sent. Check your inbox."}
            </p>
          ) : (
            <div className="space-y-2">
              <div className="hidden">
                <label>Do not fill</label>
                <input value={hp} onChange={(e) => setHp(e.target.value)} />
              </div>
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder={lang === "ro" ? "Email" : "Email"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                inputMode="email"
              />
              <label className="flex items-start gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                {lang === "ro" ? "Sunt de acord să primesc emailuri." : "I agree to receive emails."}
              </label>
              <Button size="sm" onClick={submit} disabled={loading || !consent} className="w-full">
                {loading ? (lang === "ro" ? "Se trimite..." : "Sending...") : lang === "ro" ? "Abonează-te" : "Subscribe"}
              </Button>
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

