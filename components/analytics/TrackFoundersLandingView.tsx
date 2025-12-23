"use client";

import { useEffect } from "react";
import { track } from "@/src/lib/analytics";

export function TrackFoundersLandingView() {
  useEffect(() => {
    track("FoundersLandingView");
  }, []);

  return null;
}

