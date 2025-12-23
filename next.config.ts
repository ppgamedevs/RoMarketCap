import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const cache = "public, s-maxage=3600, stale-while-revalidate=86400";
    const noStore = "no-store";
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Strict-Transport-Security",
        value: "max-age=31536000; includeSubDomains; preload",
      },
      {
        key: "Content-Security-Policy",
        value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://plausible.io https://js.stripe.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://plausible.io https://api.stripe.com https://*.sentry.io; frame-src https://js.stripe.com https://hooks.stripe.com; frame-ancestors 'none';",
      },
      {
        key: "Permissions-Policy",
        value: "geolocation=(), microphone=(), camera=(), payment=(self), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
      },
    ];
    return [
      { source: "/:path*", headers: security },
      { source: "/company/:path*", headers: [{ key: "Cache-Control", value: cache }] },
      { source: "/companies", headers: [{ key: "Cache-Control", value: cache }] },
      { source: "/industries/:path*", headers: [{ key: "Cache-Control", value: cache }] },
      { source: "/counties/:path*", headers: [{ key: "Cache-Control", value: cache }] },
      { source: "/movers", headers: [{ key: "Cache-Control", value: cache }] },
      { source: "/pricing", headers: [{ key: "Cache-Control", value: cache }] },
      { source: "/newsletter", headers: [{ key: "Cache-Control", value: cache }] },
      { source: "/digest", headers: [{ key: "Cache-Control", value: cache }] },
      { source: "/digest/:path*", headers: [{ key: "Cache-Control", value: cache }] },
      { source: "/api-docs", headers: [{ key: "Cache-Control", value: cache }] },
      { source: "/terms", headers: [{ key: "Cache-Control", value: cache }] },
      { source: "/privacy", headers: [{ key: "Cache-Control", value: cache }] },
      { source: "/disclaimer", headers: [{ key: "Cache-Control", value: cache }] },
      { source: "/methodology", headers: [{ key: "Cache-Control", value: cache }] },
      { source: "/status", headers: [{ key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=60" }] },

      // Noindex and/or no-store pages
      { source: "/lang", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/login", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/billing", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: noStore }] },
      { source: "/watchlist", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: noStore }] },
      { source: "/dashboard/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: noStore }] },
      { source: "/settings", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: noStore }] },
      { source: "/admin/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: noStore }] },
      { source: "/api/health", headers: [{ key: "Cache-Control", value: noStore }] },
      { source: "/billing/:path*", headers: [{ key: "Cache-Control", value: noStore }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/watchlist/:path*", headers: [{ key: "Cache-Control", value: noStore }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
