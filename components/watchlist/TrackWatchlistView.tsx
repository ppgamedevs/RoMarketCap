"use client";

import { useEffect } from "react";
import { track } from "@/src/lib/analytics";

export function TrackWatchlistView() {
  useEffect(() => {
    track("WatchlistView");
  }, []);
  return null;
}


