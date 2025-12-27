/**
 * PROMPT 60: Apply Merge
 * 
 * Merges two companies, preserving provenance and creating aliases.
 */

import { prisma } from "@/src/lib/db";
import { Prisma } from "@prisma/client";
import { logCompanyChange } from "@/src/lib/changelog/logChange";
import { CompanyChangeType } from "@prisma/client";
import { writeFieldProvenance } from "@/src/lib/ingestion/provenance";

export type MergeResult = {
  success: boolean;
  canonicalCompanyId: string;
  mergedCompanyId: string;
  aliasesCreated: number;
  error?: string;
};

/**
 * Determine which company should be the canonical one (winner)
 * Rules:
 * - Company with CUI wins
 * - If both have CUI, older company wins
 * - If neither has CUI, company with more data wins
 * - If equal, older company wins
 */
export async function determineCanonical(
  sourceId: string,
  targetId: string
): Promise<{ canonicalId: string; mergedId: string }> {
  const [source, target] = await Promise.all([
    prisma.company.findUnique({
      where: { id: sourceId },
      select: {
        id: true,
        cui: true,
        createdAt: true,
        domain: true,
        revenueLatest: true,
        employees: true,
        lastEnrichedAt: true,
      },
    }),
    prisma.company.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        cui: true,
        createdAt: true,
        domain: true,
        revenueLatest: true,
        employees: true,
        lastEnrichedAt: true,
      },
    }),
  ]);

  if (!source || !target) {
    throw new Error("One or both companies not found");
  }

  // CUI wins
  if (source.cui && !target.cui) {
    return { canonicalId: source.id, mergedId: target.id };
  }
  if (target.cui && !source.cui) {
    return { canonicalId: target.id, mergedId: source.id };
  }

  // If both have CUI, older wins
  if (source.cui && target.cui) {
    return source.createdAt < target.createdAt
      ? { canonicalId: source.id, mergedId: target.id }
      : { canonicalId: target.id, mergedId: source.id };
  }

  // Score by data completeness
  const sourceScore = [
    source.domain ? 1 : 0,
    source.revenueLatest ? 1 : 0,
    source.employees ? 1 : 0,
    source.lastEnrichedAt ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const targetScore = [
    target.domain ? 1 : 0,
    target.revenueLatest ? 1 : 0,
    target.employees ? 1 : 0,
    target.lastEnrichedAt ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  if (sourceScore > targetScore) {
    return { canonicalId: source.id, mergedId: target.id };
  }
  if (targetScore > sourceScore) {
    return { canonicalId: target.id, mergedId: source.id };
  }

  // Equal score, older wins
  return source.createdAt < target.createdAt
    ? { canonicalId: source.id, mergedId: target.id }
    : { canonicalId: target.id, mergedId: source.id };
}

/**
 * Apply merge: merge source into target (canonical)
 */
export async function applyMerge(
  sourceCompanyId: string,
  targetCompanyId: string,
  options: {
    actorUserId?: string;
    preserveProvenance?: boolean;
  } = {}
): Promise<MergeResult> {
  const { actorUserId, preserveProvenance = true } = options;

  try {
    // Determine canonical company
    const { canonicalId, mergedId } = await determineCanonical(
      sourceCompanyId,
      targetCompanyId
    );

    const [canonical, merged] = await Promise.all([
      prisma.company.findUnique({
        where: { id: canonicalId },
        select: {
          id: true,
          name: true,
          legalName: true,
          slug: true,
          cui: true,
          domain: true,
          email: true,
          phone: true,
        },
      }),
      prisma.company.findUnique({
        where: { id: mergedId },
        select: {
          id: true,
          name: true,
          legalName: true,
          slug: true,
          cui: true,
          domain: true,
          email: true,
          phone: true,
          fieldProvenance: true,
        },
      }),
    ]);

    if (!canonical || !merged) {
      return {
        success: false,
        canonicalCompanyId: canonicalId,
        mergedCompanyId: mergedId,
        aliasesCreated: 0,
        error: "One or both companies not found",
      };
    }

    // Create aliases for merged company
    const aliases: Array<{ aliasType: string; aliasValue: string }> = [];

    // Name alias
    if (merged.name && merged.name !== canonical.name) {
      aliases.push({ aliasType: "name", aliasValue: merged.name });
    }
    if (merged.legalName && merged.legalName !== canonical.legalName) {
      aliases.push({ aliasType: "name", aliasValue: merged.legalName });
    }

    // Slug alias
    if (merged.slug && merged.slug !== canonical.slug) {
      aliases.push({ aliasType: "slug", aliasValue: merged.slug });
    }

    // Domain alias
    if (merged.domain && merged.domain !== canonical.domain) {
      aliases.push({ aliasType: "domain", aliasValue: merged.domain });
    }

    // CUI alias (if different, though this shouldn't happen)
    if (merged.cui && merged.cui !== canonical.cui) {
      aliases.push({ aliasType: "cui", aliasValue: merged.cui });
    }

    // Create aliases in database
    let aliasesCreated = 0;
    for (const alias of aliases) {
      try {
        await prisma.companyAlias.create({
          data: {
            companyId: canonicalId,
            aliasType: alias.aliasType,
            aliasValue: alias.aliasValue,
            source: `merge:${mergedId}`,
          },
        });
        aliasesCreated++;
      } catch (error) {
        // Ignore duplicate alias errors
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          continue;
        }
        throw error;
      }
    }

    // Mark merged company as merged
    await prisma.company.update({
      where: { id: mergedId },
      data: {
        mergedIntoCompanyId: canonicalId,
        visibilityStatus: "HIDDEN", // Hide from public listings
        isPublic: false,
      },
    });

    // Preserve provenance if requested
    if (preserveProvenance && merged.fieldProvenance) {
      const mergedProvenance = merged.fieldProvenance as Record<string, unknown>;
      const canonicalProvenance = await prisma.company.findUnique({
        where: { id: canonicalId },
        select: { fieldProvenance: true },
      });

      const canonicalProv = (canonicalProvenance?.fieldProvenance as Record<string, unknown>) || {};

      // Merge provenance (canonical takes precedence for same fields)
      for (const [field, prov] of Object.entries(mergedProvenance)) {
        if (!canonicalProv[field]) {
          const provData = prov as { sourceId?: string; sourceRef?: string; confidence?: number };
          if (provData.sourceId && provData.sourceRef) {
            await writeFieldProvenance(
              canonicalId,
              field,
              provData.sourceId as any,
              provData.sourceRef,
              provData.confidence || 50,
              `merge:${mergedId}`
            );
          }
        }
      }
    }

    // Log change
    await logCompanyChange({
      companyId: canonicalId,
      changeType: CompanyChangeType.ENRICHMENT,
      metadata: {
        action: "merge",
        mergedCompanyId: mergedId,
        mergedCompanyName: merged.name,
        aliasesCreated,
      },
    }).catch(() => null);

    // Update merge candidate status
    await prisma.mergeCandidate.updateMany({
      where: {
        OR: [
          { sourceCompanyId: sourceCompanyId, targetCompanyId: targetCompanyId },
          { sourceCompanyId: targetCompanyId, targetCompanyId: sourceCompanyId },
        ],
      },
      data: {
        status: "APPROVED",
        reviewedByUserId: actorUserId || null,
        reviewedAt: new Date(),
      },
    });

    return {
      success: true,
      canonicalCompanyId: canonicalId,
      mergedCompanyId: mergedId,
      aliasesCreated,
    };
  } catch (error) {
    return {
      success: false,
      canonicalCompanyId: targetCompanyId,
      mergedCompanyId: sourceCompanyId,
      aliasesCreated: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

