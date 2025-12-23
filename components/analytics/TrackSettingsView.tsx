"use client";

import { useEffect } from "react";
import { track } from "@/src/lib/analytics";

export function TrackSettingsView() {
  useEffect(() => {
    track("SettingsView");
  }, []);
  return null;
}

