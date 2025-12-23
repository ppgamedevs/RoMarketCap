import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/src/lib/db";
import { getSiteUrl } from "@/lib/seo/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ cui: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { cui } = await params;
  const company = await prisma.company.findUnique({
    where: { cui },
    select: { slug: true, canonicalSlug: true, name: true, cui: true },
  });
  if (!company) return {};

  const base = getSiteUrl();
  const canonicalSlug = company.canonicalSlug ?? company.slug;
  const canonical = `${base}/company/${encodeURIComponent(canonicalSlug)}`;
  const title = `${company.name} - RoMarketCap`;
  const description = `Estimated market cap and ROMC score for ${company.name} (CUI ${company.cui ?? "N/A"}).`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: false, follow: true }, // noindex - redirect to canonical
    openGraph: { type: "website", title, description, url: canonical },
    twitter: { card: "summary", title, description },
  };
}

export default async function CompanyByCuiPage({ params }: PageProps) {
  const { cui } = await params;
  const company = await prisma.company.findUnique({
    where: { cui },
    select: { slug: true, canonicalSlug: true, name: true, cui: true },
  });
  if (!company) notFound();

  // Canonical is /company/[slug]. Keep /c/[cui] as convenience entry.
  const canonicalSlug = company.canonicalSlug ?? company.slug;
  if (canonicalSlug) redirect(`/company/${canonicalSlug}`);

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{company.name}</h1>
      <p className="mt-2 text-sm text-muted-foreground">CUI {company.cui ?? "N/A"}</p>
      <div className="mt-6 text-sm">
        <Link className="underline underline-offset-4" href="/company">
          Back to companies
        </Link>
      </div>
    </main>
  );
}


