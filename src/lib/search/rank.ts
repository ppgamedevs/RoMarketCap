export type SearchResult = {
  slug: string;
  name: string;
  cui: string;
  city: string | null;
  county: string | null;
  score: number; // Ranking score
};

/**
 * Calculate ranking score for a search result.
 * Higher score = better match.
 */
export function calculateSearchScore(
  company: {
    name: string;
    cui: string;
    slug: string;
    website: string | null;
    dataConfidence: number | null;
    lastEnrichedAt: Date | null;
  },
  normalizedQuery: string,
  queryTokens: string[],
): number {
  let score = 0;
  const nameLower = company.name.toLowerCase();
  const cuiLower = company.cui.toLowerCase();
  const slugLower = company.slug.toLowerCase();
  const websiteLower = company.website?.toLowerCase() ?? "";

  // Exact match on name (highest priority)
  if (nameLower === normalizedQuery) {
    score += 1000;
  } else if (nameLower.startsWith(normalizedQuery)) {
    score += 500;
  } else if (nameLower.includes(normalizedQuery)) {
    score += 200;
  }

  // Exact match on CUI
  if (cuiLower === normalizedQuery) {
    score += 800;
  } else if (cuiLower.includes(normalizedQuery)) {
    score += 300;
  }

  // Exact match on slug
  if (slugLower === normalizedQuery) {
    score += 600;
  } else if (slugLower.startsWith(normalizedQuery)) {
    score += 300;
  } else if (slugLower.includes(normalizedQuery)) {
    score += 150;
  }

  // Domain match (if query looks like a domain)
  if (normalizedQuery.includes(".") && websiteLower.includes(normalizedQuery)) {
    score += 400;
  }

  // Token matching (all tokens must be present)
  const allTokensMatch = queryTokens.every((token) => {
    return (
      nameLower.includes(token) ||
      slugLower.includes(token) ||
      cuiLower.includes(token) ||
      websiteLower.includes(token)
    );
  });
  if (allTokensMatch && queryTokens.length > 1) {
    score += 100 * queryTokens.length;
  }

  // Boost by data confidence (0-100 -> 0-50 points)
  if (company.dataConfidence != null) {
    score += company.dataConfidence * 0.5;
  }

  // Boost by recency of enrichment (more recent = higher boost)
  if (company.lastEnrichedAt) {
    const daysSinceEnrichment = Math.max(0, (Date.now() - company.lastEnrichedAt.getTime()) / (1000 * 60 * 60 * 24));
    const recencyBoost = Math.max(0, 50 - daysSinceEnrichment * 2); // Decay over 25 days
    score += recencyBoost;
  }

  return score;
}

