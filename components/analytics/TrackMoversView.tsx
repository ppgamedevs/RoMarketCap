"use client";

import { useEffect } from "react";
import { track } from "@/src/lib/analytics";

export function TrackMoversView() {
  useEffect(() => {
    track("MoversView");
  }, []);
  return null;
}


