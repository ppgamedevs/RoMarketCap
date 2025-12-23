const DEV_FALLBACK = "http://localhost:3000";
const PROD_FALLBACK = "https://romarketcap.ro";

export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  const isProd = process.env.NODE_ENV === "production";
  return isProd ? PROD_FALLBACK : DEV_FALLBACK;
}


