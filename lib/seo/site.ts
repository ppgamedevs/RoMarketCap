import { getSiteUrl as getSiteUrlImpl } from "@/src/lib/siteUrl";

export function getSiteUrl(): string {
  // Single source of truth, used across metadata, JSON-LD, sitemaps.
  // Keep this wrapper for backward compatibility with existing imports.
  return getSiteUrlImpl();
}

export const SITE_NAME = "RoMarketCap.com";

export const SUPPORTED_LOCALES = ["ro", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function getLocaleBasePath(locale: SupportedLocale): string {
  return locale === "ro" ? "/ro" : "/en";
}


