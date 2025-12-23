import type { Metadata } from "next";
import { getLocaleBasePath, getSiteUrl, SITE_NAME, type SupportedLocale } from "@/lib/seo/site";

type DefaultMetadataArgs = {
  locale: SupportedLocale;
};

export function getDefaultMetadata({ locale }: DefaultMetadataArgs): Metadata {
  const baseUrl = new URL(getSiteUrl());
  const localePath = getLocaleBasePath(locale);

  const title = SITE_NAME;
  const description =
    locale === "ro"
      ? "Inteligență de piață pentru companii private din România. Estimări. Doar informativ. Nu este consultanță financiară."
      : "Market intelligence for Romanian private companies. Estimates. Informational only. Not financial advice.";

  return {
    metadataBase: baseUrl,
    title,
    description,
    applicationName: SITE_NAME,
    alternates: {
      canonical: localePath,
      languages: {
        ro: "/ro",
        en: "/en",
      },
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url: localePath,
      locale: locale === "ro" ? "ro_RO" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

type EntityKind = "company";

type EntityMetadataArgs = {
  locale: SupportedLocale;
  kind: EntityKind;
  slug: string;
} & Metadata;

export function getEntityMetadata(args: EntityMetadataArgs): Metadata {
  const baseUrl = new URL(getSiteUrl());
  const { locale, kind, slug, ...base } = args;

  const roPath = kind === "company" ? `/ro/companii/${encodeURIComponent(slug)}` : "/ro";
  const enPath = kind === "company" ? `/en/companies/${encodeURIComponent(slug)}` : "/en";

  const canonical = locale === "ro" ? roPath : enPath;
  const title =
    kind === "company"
      ? `${slug} — ${SITE_NAME}`
      : typeof base.title === "string"
        ? base.title
        : SITE_NAME;

  return {
    ...base,
    metadataBase: baseUrl,
    title,
    alternates: {
      canonical,
      languages: {
        ro: roPath,
        en: enPath,
      },
    },
  };
}


