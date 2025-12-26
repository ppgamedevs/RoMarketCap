import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getDefaultMetadata } from "@/lib/seo/metadata";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { getLangFromRequest } from "@/src/lib/i18n";
import { PlausibleScript } from "@/components/analytics/PlausibleScript";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { getSiteUrl } from "@/lib/seo/site";
import { cookies } from "next/headers";
import { CookieConsentBanner } from "@/components/consent/CookieConsentBanner";
import { ReferralCapture } from "@/components/referrals/ReferralCapture";
import { ReadOnlyBanner } from "@/components/layout/ReadOnlyBanner";
import { DemoBanner } from "@/components/layout/DemoBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  ...getDefaultMetadata({ locale: "ro" }),
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const lang = await getLangFromRequest();
  const consent = (await cookies()).get("romc_consent_analytics")?.value ?? null;
  const allowAnalytics = consent === "1" && Boolean(process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN);
  const siteUrl = getSiteUrl();
  const google = process.env.GOOGLE_SITE_VERIFICATION?.trim() || null;
  const bing = process.env.BING_SITE_VERIFICATION?.trim() || null;
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "RoMarketCap",
    url: siteUrl,
  };
  return (
    <html lang={lang}>
      <head>
        {google ? <meta name="google-site-verification" content={google} /> : null}
        {bing ? <meta name="msvalidate.01" content={bing} /> : null}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ReferralCapture />
        {allowAnalytics ? (
          <>
            <PlausibleScript />
            <GoogleAnalytics />
          </>
        ) : null}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />
        <SiteHeader lang={lang} />
        <ReadOnlyBanner />
        <DemoBanner />
        {children}
        <SiteFooter />
        <CookieConsentBanner lang={lang} />
      </body>
    </html>
  );
}
