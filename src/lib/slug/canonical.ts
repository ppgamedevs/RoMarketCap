import { prisma } from "@/src/lib/db";
import { slugifyCompanyName } from "@/src/lib/slug";

/**
 * Generate a canonical slug for a company, handling collisions.
 * Strategy:
 * - Base slug from name
 * - If collision, append "-cui{last8digits}" or "-jud" if it's a court entity
 * - Store canonical slug in DB
 */
export async function ensureCanonicalSlug(
  companyId: string,
  name: string,
  cui: string | null,
  isJudicialEntity = false,
): Promise<string> {
  const baseSlug = slugifyCompanyName(name);
  if (!baseSlug) {
    // Fallback: use CUI or generate a stable slug
    const fallback = cui ? `company-${cui.toLowerCase()}` : `company-${companyId.slice(0, 8)}`;
    return fallback;
  }

  // Try base slug first
  const existing = await prisma.company.findFirst({
    where: {
      OR: [{ slug: baseSlug }, { canonicalSlug: baseSlug }],
      NOT: { id: companyId },
    },
  });

  if (!existing) {
    return baseSlug;
  }

  // Collision detected - append suffix
  let suffix = "";
  if (isJudicialEntity) {
    suffix = "-jud";
  } else if (cui) {
    // Use last 8 digits of CUI
    const cuiDigits = cui.replace(/\D/g, ""); // Remove non-digits
    suffix = cuiDigits.length >= 8 ? `-cui${cuiDigits.slice(-8)}` : `-cui${cuiDigits}`;
  } else {
    // Fallback: use company ID
    suffix = `-${companyId.slice(0, 8)}`;
  }

  const candidateSlug = `${baseSlug}${suffix}`;

  // Check if candidate also collides
  const candidateExists = await prisma.company.findFirst({
    where: {
      OR: [{ slug: candidateSlug }, { canonicalSlug: candidateSlug }],
      NOT: { id: companyId },
    },
  });

  if (candidateExists) {
    // Double collision - append company ID
    return `${candidateSlug}-${companyId.slice(0, 8)}`;
  }

  return candidateSlug;
}

/**
 * Update canonical slug for a company and create redirect if slug changed.
 */
export async function updateCanonicalSlug(
  companyId: string,
  newName: string,
  cui: string | null,
  isJudicialEntity = false,
): Promise<{ canonicalSlug: string; oldSlug?: string; needsRedirect: boolean }> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { slug: true, canonicalSlug: true },
  });

  if (!company) {
    throw new Error(`Company ${companyId} not found`);
  }

  const newCanonicalSlug = await ensureCanonicalSlug(companyId, newName, cui, isJudicialEntity);
  const currentCanonical = company.canonicalSlug ?? company.slug;

  if (currentCanonical === newCanonicalSlug) {
    // No change needed
    return { canonicalSlug: newCanonicalSlug, needsRedirect: false };
  }

  // Update canonical slug
  await prisma.company.update({
    where: { id: companyId },
    data: { canonicalSlug: newCanonicalSlug },
  });

  // If the actual slug differs from canonical, we may need to update it too
  // But we keep the old slug for redirect purposes
  const needsRedirect = company.slug !== newCanonicalSlug;

  return {
    canonicalSlug: newCanonicalSlug,
    oldSlug: needsRedirect ? company.slug : undefined,
    needsRedirect,
  };
}

