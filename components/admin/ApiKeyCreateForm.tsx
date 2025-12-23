"use client";

import { useState } from "react";

export function ApiKeyCreateForm() {
  const [label, setLabel] = useState("");
  const [plan, setPlan] = useState<"FREE" | "PARTNER" | "PREMIUM">("PARTNER");
  const [tier, setTier] = useState<"anon" | "auth" | "premium">("premium");
  const [active, setActive] = useState(true);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onCreate = async () => {
    setLoading(true);
    setError(null);
    setCreatedKey(null);
    try {
      const res = await fetch("/api/admin/api-keys/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ label, plan, rateLimitKind: tier, active }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      setCreatedKey(json?.key ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-card p-6">
      <h2 className="text-sm font-medium">Create API key</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="text-xs text-muted-foreground">Label</label>
          <input className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Plan</label>
          <select
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={plan}
            onChange={(e) => setPlan(e.target.value === "FREE" ? "FREE" : e.target.value === "PREMIUM" ? "PREMIUM" : "PARTNER")}
          >
            <option value="FREE">FREE</option>
            <option value="PARTNER">PARTNER</option>
            <option value="PREMIUM">PREMIUM</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Rate limit tier</label>
          <select
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={tier}
            onChange={(e) => setTier(e.target.value === "premium" ? "premium" : e.target.value === "auth" ? "auth" : "anon")}
          >
            <option value="anon">anon</option>
            <option value="auth">auth</option>
            <option value="premium">premium</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
      </div>
      <button
        className="mt-4 inline-flex rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
        onClick={onCreate}
        disabled={loading || !label.trim()}
        type="button"
      >
        {loading ? "Loading..." : "Create"}
      </button>

      {createdKey ? (
        <div className="mt-4 rounded-md border p-3">
          <p className="text-sm font-medium">Copy this key now (shown once)</p>
          <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-xs">{createdKey}</pre>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}


