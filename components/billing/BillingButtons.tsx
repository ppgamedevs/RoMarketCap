"use client";

import { useState } from "react";
import Link from "next/link";
import { track } from "@/src/lib/analytics";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/Alert";

async function postJson(url: string, body?: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : null,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Request failed");
  return json as { ok: true; url: string };
}

export function BillingButtons({ isPremium }: { isPremium: boolean }) {
  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onUpgrade = async () => {
    setLoading("checkout");
    setError(null);
    try {
      track("CheckoutStart");
      const { url } = await postJson("/api/billing/checkout", { returnPath: "/billing?checkout=success" });
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setLoading(null);
    }
  };

  const onPortal = async () => {
    setLoading("portal");
    setError(null);
    try {
      const { url } = await postJson("/api/billing/portal");
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Portal failed");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mt-6 space-y-3">
      <div className="flex flex-wrap gap-3">
        {!isPremium ? (
          <Button onClick={onUpgrade} disabled={loading !== null}>
            {loading === "checkout" ? "Loading..." : "Upgrade"}
          </Button>
        ) : (
          <Button onClick={onPortal} disabled={loading !== null}>
            {loading === "portal" ? "Loading..." : "Manage subscription"}
          </Button>
        )}
        <Link href="/companies">
          <Button variant="outline">Back to companies</Button>
        </Link>
      </div>
      {error && (
        <Alert variant="error">
          <p className="text-sm">{error}</p>
        </Alert>
      )}
    </div>
  );
}


