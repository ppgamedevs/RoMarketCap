"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { track } from "@/src/lib/analytics";
import type { Lang } from "@/src/lib/i18n";

type ClaimCtasProps = {
  lang: Lang;
  companySlug: string;
  companyCui: string | null;
  romcScore: number | null;
  isClaimed: boolean;
  isPremium: boolean;
};

export function ClaimCtas({ lang, companySlug, companyCui, romcScore, isClaimed, isPremium }: ClaimCtasProps) {
  if (isClaimed) return null;

  const handleCtaClick = (ctaType: string) => {
    track("ClaimCTAClick", { companySlug, cui: companyCui, ctaType, romcScore: romcScore ?? null });
  };

  const ctas = [
    {
      id: "improve-score",
      title: lang === "ro" ? "Îmbunătățește-ți scorul" : "Improve your score",
      description:
        lang === "ro"
          ? "Revendică compania și actualizează datele pentru un scor ROMC mai precis."
          : "Claim your company and update data for a more accurate ROMC score.",
      href: `/company/${encodeURIComponent(companySlug)}?claim=true`,
      variant: "default" as const,
    },
    {
      id: "unlock-report",
      title: lang === "ro" ? "Deblochează raportul complet" : "Unlock full report",
      description:
        lang === "ro"
          ? "Vezi forecast-uri, analize detaliate și comparații cu concurenții."
          : "See forecasts, detailed analysis, and comparisons with competitors.",
      href: isPremium ? `/company/${encodeURIComponent(companySlug)}` : "/pricing",
      variant: "outline" as const,
    },
    {
      id: "investor-view",
      title: lang === "ro" ? "Vezi cum te văd investitorii" : "See how investors see you",
      description:
        lang === "ro"
          ? "Accesează datele complete pe care le folosesc investitorii pentru evaluare."
          : "Access the complete data investors use for evaluation.",
      href: isPremium ? `/company/${encodeURIComponent(companySlug)}` : "/pricing",
      variant: "outline" as const,
    },
  ];

  return (
    <Card className="mt-6">
      <CardHeader>
        <h2 className="text-sm font-medium">{lang === "ro" ? "Acțiuni recomandate" : "Recommended actions"}</h2>
      </CardHeader>
      <CardBody>
        <div className="grid gap-3 md:grid-cols-3">
          {ctas.map((cta) => (
            <Link
              key={cta.id}
              href={cta.href}
              onClick={() => handleCtaClick(cta.id)}
              className="block rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              <h3 className="text-sm font-medium">{cta.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{cta.description}</p>
            </Link>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

