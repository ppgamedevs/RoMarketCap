/**
 * Watchlist Star Component
 * 
 * Star icon for adding/removing companies from watchlist
 */

"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useSession } from "next-auth/react";
import Link from "next/link";

type WatchlistStarProps = {
  companyId: string;
  initialWatched: boolean;
  className?: string;
};

export function WatchlistStar({ companyId, initialWatched, className = "" }: WatchlistStarProps) {
  const { data: session } = useSession();
  const [watched, setWatched] = useState(initialWatched);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      // Redirect to login - handled by Link wrapper
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/watchlist/toggle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Request failed");
      setWatched(Boolean(json?.watched));
    } catch (error) {
      console.error("[WatchlistStar] Error:", error);
      // Revert on error
      setWatched(initialWatched);
    } finally {
      setLoading(false);
    }
  };

  if (!session?.user) {
    return (
      <Link href="/login" className={className} onClick={(e) => e.stopPropagation()}>
        <Star className="h-4 w-4 text-muted-foreground hover:text-yellow-500 transition-colors" />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`${className} disabled:opacity-50`}
      aria-label={watched ? "Remove from watchlist" : "Add to watchlist"}
    >
      <Star
        className={`h-4 w-4 transition-colors ${
          watched ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground hover:text-yellow-500"
        }`}
      />
    </button>
  );
}
