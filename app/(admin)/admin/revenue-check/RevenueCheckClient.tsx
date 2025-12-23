"use client";

import { useState } from "react";
import type { FeatureFlag } from "@/src/lib/flags/flags";

interface RevenueCheckClientProps {
  flags: Record<FeatureFlag, boolean>;
  stripeOk: boolean;
}

export function RevenueCheckClient({ flags, stripeOk }: RevenueCheckClientProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const toggleFlag = async (flag: FeatureFlag, value: boolean) => {
    setLoading(flag);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/flags/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag, value: value ? "true" : "false" }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to toggle flag");
      }

      setSuccess(`Flag ${flag} ${value ? "enabled" : "disabled"}`);
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(null);
    }
  };

  const sendTestCheckout = async () => {
    setLoading("checkout");
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/revenue/test-checkout", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to create test checkout");
      }

      if (data.url) {
        window.open(data.url, "_blank");
        setSuccess("Test checkout link opened in new tab");
      } else {
        setSuccess("Test checkout created (check your email)");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(null);
    }
  };

  const checklist = [
    {
      label: "Stripe env vars present",
      ok: stripeOk,
      hint: "STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID_MONTHLY",
    },
    {
      label: "Price ID set",
      ok: Boolean(process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID_MONTHLY),
      hint: "STRIPE_PRICE_ID_MONTHLY must be set",
    },
    {
      label: "Webhook secret set",
      ok: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      hint: "STRIPE_WEBHOOK_SECRET must be set",
    },
    {
      label: "Billing reconcile cron healthy",
      ok: flags.CRON_BILLING_RECONCILE,
      hint: "Enable CRON_BILLING_RECONCILE flag",
    },
  ];

  return (
    <div className="mt-6 space-y-6">
      {/* Checklist */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-medium">Verification Checklist</h2>
        <div className="mt-4 space-y-2">
          {checklist.map((item) => (
            <div key={item.label} className="flex items-start justify-between gap-4 rounded-md border p-3">
              <div>
                <div className="flex items-center gap-2">
                  <span>{item.ok ? "✅" : "❌"}</span>
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
                {!item.ok && <div className="mt-1 text-xs text-muted-foreground">{item.hint}</div>}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="rounded-xl border bg-card p-6">
        <h2 className="text-sm font-medium">Quick Actions</h2>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Turn ON paywalls</div>
              <div className="text-xs text-muted-foreground">Enable PREMIUM_PAYWALLS flag</div>
            </div>
            <button
              onClick={() => toggleFlag("PREMIUM_PAYWALLS", true)}
              disabled={loading !== null || flags.PREMIUM_PAYWALLS}
              className="rounded-md bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {loading === "PREMIUM_PAYWALLS" ? "..." : flags.PREMIUM_PAYWALLS ? "ON" : "Enable"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Turn ON placements</div>
              <div className="text-xs text-muted-foreground">Enable PLACEMENTS flag</div>
            </div>
            <button
              onClick={() => toggleFlag("PLACEMENTS", true)}
              disabled={loading !== null || flags.PLACEMENTS}
              className="rounded-md bg-green-600 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {loading === "PLACEMENTS" ? "..." : flags.PLACEMENTS ? "ON" : "Enable"}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <div className="text-sm font-medium">Send test purchase link</div>
              <div className="text-xs text-muted-foreground">Creates a test checkout session for your account</div>
            </div>
            <button
              onClick={sendTestCheckout}
              disabled={loading !== null}
              className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {loading === "checkout" ? "..." : "Send Test Link"}
            </button>
          </div>
        </div>
      </section>

      {/* Status Messages */}
      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">{success}</div>
      )}
    </div>
  );
}

