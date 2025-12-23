import { normalizeWebsite, extractDomain, extractMetaFromHtml, extractSocialLinksFromHtml, extractContactFromHtml, type Socials } from "./normalize";

export type EnrichInput = {
  id: string;
  website: string | null;
};

export type EnrichPatch = Partial<{
  website: string;
  domain: string;
  email: string;
  phone: string;
  socials: Socials;
  descriptionShort: string;
  tags: string[];
}>;

async function fetchHtmlWithLimits(url: string, timeoutMs: number, maxBytes: number, maxRedirects: number): Promise<string | null> {
  let current = url;
  for (let i = 0; i <= maxRedirects; i++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(current, {
        redirect: "manual",
        signal: ac.signal,
        headers: {
          "user-agent": "RoMarketCapEnricher/1.0",
          accept: "text/html,application/xhtml+xml",
        },
      });

      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return null;
        const next = new URL(loc, current).toString();
        current = next;
        continue;
      }

      if (!res.ok) return null;
      const ct = res.headers.get("content-type") ?? "";
      if (!/text\/html/i.test(ct) && ct) return null;

      const body = res.body;
      if (!body) return null;
      const reader = body.getReader();
      const chunks: Uint8Array[] = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received += value.byteLength;
          if (received > maxBytes) return null;
          chunks.push(value);
        }
      }
      const buf = new Uint8Array(received);
      let offset = 0;
      for (const c of chunks) {
        buf.set(c, offset);
        offset += c.byteLength;
      }
      return new TextDecoder("utf-8").decode(buf);
    } catch {
      return null;
    } finally {
      clearTimeout(t);
    }
  }
  return null;
}

export async function enrichCompany(input: EnrichInput): Promise<{ patch: EnrichPatch; signalsFoundCount: number }> {
  const patch: EnrichPatch = {};
  let signalsFoundCount = 0;

  const website = normalizeWebsite(input.website);
  if (!website) return { patch, signalsFoundCount };

  patch.website = website;
  const domain = extractDomain(website);
  if (domain) {
    patch.domain = domain;
    signalsFoundCount += 1;
  }

  const html = await fetchHtmlWithLimits(website, 3000, 300_000, 2);
  if (!html) return { patch, signalsFoundCount };

  const meta = extractMetaFromHtml(html);
  if (meta.description) {
    patch.descriptionShort = meta.description;
    signalsFoundCount += 1;
  } else if (meta.title) {
    patch.descriptionShort = meta.title;
    signalsFoundCount += 1;
  }

  const socials = extractSocialLinksFromHtml(html);
  if (Object.keys(socials).length) {
    patch.socials = socials;
    signalsFoundCount += 1;
  }

  const contact = extractContactFromHtml(html);
  if (contact.email) {
    patch.email = contact.email;
    signalsFoundCount += 1;
  }
  if (contact.phone) {
    patch.phone = contact.phone;
    signalsFoundCount += 1;
  }

  return { patch, signalsFoundCount };
}


