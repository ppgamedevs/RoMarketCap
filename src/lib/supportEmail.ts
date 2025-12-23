export function parseEmailFromFromHeader(from: string | undefined | null): string | null {
  if (!from) return null;
  const m = /<([^>]+)>/.exec(from);
  const addr = (m ? m[1] : from).trim();
  if (!addr) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return null;
  return addr;
}

export function getSupportEmail(): string {
  const explicit = process.env.ROMC_SUPPORT_EMAIL?.trim();
  if (explicit) return explicit;
  const derived = parseEmailFromFromHeader(process.env.EMAIL_FROM);
  if (derived) return derived;
  return "contact@romarketcap.ro";
}


