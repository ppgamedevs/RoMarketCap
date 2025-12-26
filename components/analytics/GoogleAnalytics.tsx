import Script from "next/script";

/**
 * Google Analytics (gtag.js) component
 * Only loads if analytics consent is given
 */
export function GoogleAnalytics() {
  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-4KDYLFPLHJ"
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-4KDYLFPLHJ');
        `}
      </Script>
    </>
  );
}

