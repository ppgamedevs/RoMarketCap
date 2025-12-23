"use client";

import Link from "next/link";
import { track } from "@/src/lib/analytics";
import { Button } from "@/components/ui/button";

export function PricingCtas({ isAuthed }: { isAuthed: boolean }) {
  const href = isAuthed ? "/billing" : "/login";
  return (
    <div className="flex flex-wrap gap-3">
      <Link href={href} onClick={() => track("PricingCTA", { target: href })}>
        <Button>Upgrade</Button>
      </Link>
      <Link href="/partners">
        <Button variant="outline">Partner/API</Button>
      </Link>
      <Link href="/companies">
        <Button variant="outline">Browse companies</Button>
      </Link>
    </div>
  );
}


