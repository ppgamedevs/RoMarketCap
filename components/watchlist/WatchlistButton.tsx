"use client";

import Link from "next/link";
import { useState } from "react";
import { track } from "@/src/lib/analytics";

export function WatchlistButton(props: { authed: boolean; companyId: string; initialWatched: boolean }) {
  const [watched, setWatched] = useState(props.initialWatched);
  const [loading, setLoading] = useState(false);

  const onToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/watchlist/toggle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId: props.companyId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      setWatched(Boolean(json?.watched));
      track("WatchlistAdd", { watched: Boolean(json?.watched) });
    } finally {
      setLoading(false);
    }
  };

  if (!props.authed) {
    return (
      <Link className="inline-flex rounded-md border px-3 py-2 text-sm" href="/login">
        Add to Watchlist
      </Link>
    );
  }

  return (
    <button className="inline-flex rounded-md border px-3 py-2 text-sm disabled:opacity-60" onClick={onToggle} disabled={loading} type="button">
      {watched ? "Watching" : "Add to Watchlist"}
    </button>
  );
}


