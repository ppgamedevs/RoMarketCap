"use client";

import Link from "next/link";
import { track } from "@/src/lib/analytics";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/src/lib/i18n";

export function PricingCtas({ isAuthed, lang }: { isAuthed: boolean; lang: Lang }) {
  const href = isAuthed ? "/billing" : "/login";
  return (
    <div className="flex flex-wrap justify-center gap-4">
      <Link href={href} onClick={() => track("PricingCTA", { target: href })}>
        <Button size="lg" className="min-w-[140px]">
          {lang === "ro" ? "Upgrade" : "Upgrade"}
        </Button>
      </Link>
      <Link href="/partners">
        <Button variant="outline" size="lg" className="min-w-[140px]">
          {lang === "ro" ? "Partner/API" : "Partner/API"}
        </Button>
      </Link>
      <Link href="/companies">
        <Button variant="outline" size="lg" className="min-w-[140px]">
          {lang === "ro" ? "Vezi companii" : "Browse companies"}
        </Button>
      </Link>
    </div>
  );
}


