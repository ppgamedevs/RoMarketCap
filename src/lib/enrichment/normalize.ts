export type Socials = Partial<{
  linkedin: string;
  facebook: string;
  instagram: string;
  x: string;
}>;

export function sanitizeText(input: string | null | undefined, maxLen: number): string | null {
  if (!input) return null;
  let s = String(input);
  s = s.replace(/<script[\s\S]*?<\/script>/gi, " ");
  s = s.replace(/<style[\s\S]*?<\/style>/gi, " ");
  s = s.replace(/<[^>]+>/g, " ");
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  s = s.replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (s.length > maxLen) s = s.slice(0, maxLen).trim();
  return s || null;
}

export function normalizeWebsite(input: string | null | undefined): string | null {
  if (!input) return null;
  let raw = input.trim();
  if (!raw) return null;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  try {
    const u = new URL(raw);
    if (!u.hostname) return null;
    const protocol = "https:";
    const host = u.hostname.toLowerCase();
    // Keep only origin to reduce tracking params and to fetch homepage.
    return `${protocol}//${host}`;
  } catch {
    return null;
  }
}

export function extractDomain(website: string | null | undefined): string | null {
  const normalized = normalizeWebsite(website);
  if (!normalized) return null;
  try {
    const u = new URL(normalized);
    let h = u.hostname.toLowerCase();
    if (h.startsWith("www.")) h = h.slice(4);
    return h || null;
  } catch {
    return null;
  }
}

export function sanitizeEmail(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  if (!s) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return null;
  if (s.length > 200) return null;
  return s;
}

export function sanitizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let s = input.trim();
  if (!s) return null;
  s = s.replace(/[^\d+]/g, "");
  if (s.startsWith("00")) s = `+${s.slice(2)}`;
  const digits = s.replace(/[^\d]/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  if (s.length > 24) s = s.slice(0, 24);
  return s;
}

export function extractMetaFromHtml(html: string): { title: string | null; description: string | null } {
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const title = sanitizeText(titleMatch?.[1], 120);

  const metaDescMatch =
    /<meta[^>]+name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i.exec(html) ??
    /<meta[^>]+content=["']([^"']+)["'][^>]*name=["']description["'][^>]*>/i.exec(html);
  const description = sanitizeText(metaDescMatch?.[1], 240);

  return { title, description };
}

export function extractSocialLinksFromHtml(html: string): Socials {
  const socials: Socials = {};
  const hrefs: string[] = [];
  const re = /href=["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) hrefs.push(m[1]!);

  const pick = (pred: (u: string) => boolean) => hrefs.find((u) => pred(u)) ?? null;

  const linkedin = pick((u) => /linkedin\.com\//i.test(u));
  const facebook = pick((u) => /facebook\.com\//i.test(u));
  const instagram = pick((u) => /instagram\.com\//i.test(u));
  const x = pick((u) => /(x\.com|twitter\.com)\//i.test(u));

  if (linkedin) socials.linkedin = linkedin;
  if (facebook) socials.facebook = facebook;
  if (instagram) socials.instagram = instagram;
  if (x) socials.x = x;
  return socials;
}

export function extractContactFromHtml(html: string): { email: string | null; phone: string | null } {
  const mailto = /mailto:([^"'\s>]+)/i.exec(html)?.[1] ?? null;
  const tel = /tel:([^"'\s>]+)/i.exec(html)?.[1] ?? null;
  return { email: sanitizeEmail(mailto), phone: sanitizePhone(tel) };
}


