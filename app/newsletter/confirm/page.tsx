import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo/site";
import { prisma } from "@/src/lib/db";
import { verifyNewsletterConfirmToken } from "@/src/lib/newsletter/token";
import { getLangFromRequest } from "@/src/lib/i18n";
import { TrackNewsletterConfirm } from "@/components/analytics/TrackNewsletterConfirm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${getSiteUrl()}/newsletter/confirm`;
  return { title: "Newsletter confirm - RoMarketCap", alternates: { canonical } };
}

function asString(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] ?? "" : v ?? "";
}

export default async function NewsletterConfirmPage({ searchParams }: { searchParams: SearchParams }) {
  const lang = await getLangFromRequest();
  const sp = await searchParams;
  const token = asString(sp.token).trim();

  let ok = false;
  if (token) {
    const v = verifyNewsletterConfirmToken(token);
    if (v.ok) {
      const updated = await prisma.newsletterSubscriber.updateMany({
        where: { id: v.subscriberId, status: "ACTIVE" },
        data: { confirmedAt: new Date() },
      });
      ok = updated.count > 0;
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <TrackNewsletterConfirm ok={ok} />
      <h1 className="text-2xl font-semibold tracking-tight">{lang === "ro" ? "Confirmare newsletter" : "Newsletter confirmation"}</h1>
      <p className="mt-4 text-sm text-muted-foreground">
        {ok
          ? lang === "ro"
            ? "Abonarea a fost confirmată."
            : "Subscription confirmed."
          : lang === "ro"
            ? "Link invalid sau expirat."
            : "Invalid or expired link."}
      </p>
    </main>
  );
}


