import { prisma } from "@/src/lib/db";
import { z } from "zod";
import { sanitizeEmail, sanitizePhone, sanitizeText, normalizeWebsite, extractDomain } from "@/src/lib/enrichment/normalize";
import type { EnrichPatch } from "@/src/lib/enrichment/enrichCompany";
import { Prisma } from "@prisma/client";

const TagsSchema = z
  .array(z.string().min(1).max(24))
  .max(10)
  .transform((xs) => xs.map((s) => s.trim()).filter(Boolean));

const PatchSchema = z.object({
  website: z.string().optional(),
  domain: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  socials: z.record(z.string(), z.string()).optional(),
  descriptionShort: z.string().optional(),
  tags: TagsSchema.optional(),
});

export async function updateCompanyEnrichmentById(companyId: string, patch: EnrichPatch, now = new Date()) {
  const normalized: Record<string, unknown> = {};

  const website = normalizeWebsite(patch.website ?? null);
  if (website) normalized.website = website;

  const domain = patch.domain ? patch.domain : extractDomain(website);
  if (domain) normalized.domain = domain;

  const email = sanitizeEmail(patch.email ?? null);
  if (email) normalized.email = email;

  const phone = sanitizePhone(patch.phone ?? null);
  if (phone) normalized.phone = phone;

  if (patch.socials && Object.keys(patch.socials).length) {
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(patch.socials)) {
      const key = String(k).toLowerCase();
      if (!["linkedin", "facebook", "instagram", "x"].includes(key)) continue;
      const url = normalizeWebsite(v);
      if (url) cleaned[key] = url;
    }
    if (Object.keys(cleaned).length) normalized.socials = cleaned;
  }

  const desc = sanitizeText(patch.descriptionShort ?? null, 240);
  if (desc) normalized.descriptionShort = desc;

  if (patch.tags) {
    const parsed = TagsSchema.safeParse(patch.tags);
    if (parsed.success && parsed.data.length) normalized.tags = parsed.data;
  }

  const parsed = PatchSchema.safeParse(normalized);
  if (!parsed.success) return { ok: false as const, updated: false, patchKeys: [] as string[] };

  const data: Prisma.CompanyUpdateInput = { enrichVersion: 1 };
  const keys = Object.keys(parsed.data) as Array<keyof typeof parsed.data>;
  for (const k of keys) {
    const v = parsed.data[k];
    if (v == null) continue;
    if (k === "socials" || k === "tags") data[k] = v as Prisma.InputJsonValue;
    else (data as Record<string, unknown>)[k] = v;
  }

  const patchKeys = Object.keys(data).filter((k) => k !== "enrichVersion");
  if (patchKeys.length === 0) return { ok: true as const, updated: false, patchKeys: [] as string[] };

  data.lastEnrichedAt = now;

  await prisma.company.update({ where: { id: companyId }, data });
  return { ok: true as const, updated: true, patchKeys };
}


