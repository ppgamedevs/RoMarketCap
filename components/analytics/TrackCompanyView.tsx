"use client";

import { useEffect } from "react";
import { track } from "@/src/lib/analytics";

export function TrackCompanyView(props: { cui: string | null; industrySlug: string | null; countySlug: string | null }) {
  useEffect(() => {
    track("CompanyView", {
      cui: props.cui,
      industrySlug: props.industrySlug,
      countySlug: props.countySlug,
    });
  }, [props.cui, props.industrySlug, props.countySlug]);

  return null;
}


