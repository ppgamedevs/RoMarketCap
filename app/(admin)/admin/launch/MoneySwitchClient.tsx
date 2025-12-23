"use client";

import { useState } from "react";
import type { FeatureFlag } from "@/src/lib/flags/flags";

export function MoneySwitchClient({
  flags,
  shadowPrice,
  offerText,
}: {
  flags: Record<FeatureFlag, boolean>;
  shadowPrice: string | null;
  offerText: string | null;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [localFlags, setLocalFlags] = useState(flags);
  const [localShadowPrice, setLocalShadowPrice] = useState(shadowPrice ?? "");
  const [result, setResult] = useState<string | null>(null);

  const handleToggle = async (flag: FeatureFlag, currentValue: boolean) => {
    setLoading(flag);
    setResult(null);
    try {
      const res = await fetch("/api/admin/flags/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flag, value: currentValue ? "false" : "true" }),
      });
      const data = await res.json();
      if (data.ok) {
        setLocalFlags((prev) => ({ ...prev, [flag]: data.value }));
        setResult(`Flag ${flag} ${data.value ? "enabled" : "disabled"}`);
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(null);
    }
  };

  const handleSetShadowPrice = async () => {
    setLoading("shadow_price");
    setResult(null);
    try {
      const res = await fetch("/api/admin/pricing/shadow-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price: localShadowPrice || null }),
      });
      const data = await res.json();
      if (data.ok) {
        setResult("Shadow price updated");
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(null);
    }
  };

  const monetizationFlags: Array<{ flag: FeatureFlag; label: string }> = [
    { flag: "PREMIUM_PAYWALLS", label: "Premium Paywalls" },
    { flag: "PLACEMENTS", label: "Placements/Ads" },
    { flag: "NEWSLETTER_SENDS", label: "Newsletter Sends" },
    { flag: "API_ACCESS", label: "API Access Monetization" },
  ];

  return (
    <div className="mt-4 space-y-6">
      {/* Monetization Toggles */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground">Monetization Features</h3>
        <div className="mt-2 grid gap-2">
          {monetizationFlags.map(({ flag, label }) => (
            <div key={flag} className="flex items-center justify-between rounded-md border p-2 text-sm">
              <span>{label}</span>
              <button
                onClick={() => handleToggle(flag, localFlags[flag])}
                disabled={loading !== null}
                className={`rounded px-2 py-1 text-xs ${localFlags[flag] ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"} disabled:opacity-50`}
              >
                {loading === flag ? "..." : localFlags[flag] ? "ENABLED" : "DISABLED"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing Strategy */}
      <div>
        <h3 className="text-xs font-medium text-muted-foreground">Pricing Strategy</h3>
        <div className="mt-2 space-y-2 text-sm">
          <div>
            <div className="text-xs text-muted-foreground">Current Stripe Price ID:</div>
            <div className="font-mono text-xs">{process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "Not set"}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Shadow Price (for A/B testing):</div>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={localShadowPrice}
                onChange={(e) => setLocalShadowPrice(e.target.value)}
                placeholder="e.g., price_xxx"
                className="flex-1 rounded-md border bg-background px-2 py-1 text-xs"
              />
              <button
                onClick={handleSetShadowPrice}
                disabled={loading !== null}
                className="rounded-md border bg-background px-2 py-1 text-xs disabled:opacity-50"
              >
                {loading === "shadow_price" ? "..." : "Set"}
              </button>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Offer Banner Text:</div>
            <div className="mt-1 rounded-md border bg-muted p-2 text-xs">
              {offerText || "Not set (use NEXT_PUBLIC_LAUNCH_OFFER_TEXT)"}
            </div>
          </div>
        </div>
      </div>

      {result && <div className="text-xs text-muted-foreground">{result}</div>}
    </div>
  );
}

