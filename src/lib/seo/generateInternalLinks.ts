/**
 * Generate contextual internal links for SEO
 * 
 * Creates relevant internal links based on company, industry, and location data
 */

import type { Company } from "@prisma/client";

export type InternalLink = {
  url: string;
  anchorText: string;
  context: string;
};

/**
 * Generate internal links for a company page
 */
export function generateCompanyInternalLinks(
  company: Company,
  relatedCompanies: Array<{ slug: string; name: string }>,
  lang: "ro" | "en" = "ro"
): InternalLink[] {
  const links: InternalLink[] = [];

  // Link to industry page
  if (company.industrySlug) {
    links.push({
      url: `/industries/${encodeURIComponent(company.industrySlug)}`,
      anchorText: lang === "ro" ? `companii din ${company.industry}` : `companies in ${company.industry}`,
      context: lang === "ro" ? "Vezi toate" : "See all",
    });
  }

  // Link to county page
  if (company.countySlug) {
    links.push({
      url: `/counties/${encodeURIComponent(company.countySlug)}`,
      anchorText: lang === "ro" ? `companii din ${company.county}` : `companies in ${company.county}`,
      context: lang === "ro" ? "Vezi toate" : "See all",
    });
  }

  // Link to comparison pages with top competitors
  if (relatedCompanies.length > 0) {
    const topCompetitor = relatedCompanies[0];
    links.push({
      url: `/compare/${encodeURIComponent(company.slug)}-vs-${encodeURIComponent(topCompetitor.slug)}`,
      anchorText: lang === "ro" ? `Compară cu ${topCompetitor.name}` : `Compare with ${topCompetitor.name}`,
      context: lang === "ro" ? "Comparație detaliată" : "Detailed comparison",
    });
  }

  // Link to market movers if company has significant score change
  if (company.previousRomcAiScore !== null && company.romcAiScore !== null) {
    const delta = company.romcAiScore - company.previousRomcAiScore;
    if (Math.abs(delta) >= 5) {
      links.push({
        url: "/movers",
        anchorText: lang === "ro" ? "Market Movers" : "Market Movers",
        context: lang === "ro" ? "Vezi companiile cu cele mai mari schimbări" : "See companies with biggest changes",
      });
    }
  }

  // Link to top companies in same industry
  if (company.industrySlug) {
    links.push({
      url: `/top/${encodeURIComponent(company.industrySlug)}`,
      anchorText: lang === "ro" ? `Top companii ${company.industry}` : `Top ${company.industry} companies`,
      context: lang === "ro" ? "Vezi ranking-ul" : "See ranking",
    });
  }

  return links.slice(0, 5); // Limit to 5 links
}

/**
 * Generate internal links for an industry page
 */
export function generateIndustryInternalLinks(
  industrySlug: string,
  industryName: string,
  topCompanies: Array<{ slug: string; name: string }>,
  lang: "ro" | "en" = "ro"
): InternalLink[] {
  const links: InternalLink[] = [];

  // Link to top companies
  links.push({
    url: `/top/${encodeURIComponent(industrySlug)}`,
    anchorText: lang === "ro" ? `Top companii ${industryName}` : `Top ${industryName} companies`,
    context: lang === "ro" ? "Vezi ranking-ul complet" : "See full ranking",
  });

  // Link to company directory filtered by industry
  links.push({
    url: `/companies?industry=${encodeURIComponent(industrySlug)}`,
    anchorText: lang === "ro" ? "Director complet" : "Full directory",
    context: lang === "ro" ? "Toate companiile" : "All companies",
  });

  // Link to comparison pages for top companies
  if (topCompanies.length >= 2) {
    links.push({
      url: `/compare/${encodeURIComponent(topCompanies[0].slug)}-vs-${encodeURIComponent(topCompanies[1].slug)}`,
      anchorText: lang === "ro" ? `Compară ${topCompanies[0].name} cu ${topCompanies[1].name}` : `Compare ${topCompanies[0].name} with ${topCompanies[1].name}`,
      context: lang === "ro" ? "Comparație detaliată" : "Detailed comparison",
    });
  }

  // Link to market movers in this industry
  links.push({
    url: `/movers?industry=${encodeURIComponent(industrySlug)}`,
    anchorText: lang === "ro" ? "Tendințe în industrie" : "Industry trends",
    context: lang === "ro" ? "Vezi companiile în creștere" : "See growing companies",
  });

  return links.slice(0, 4);
}

/**
 * Generate internal links for a comparison page
 */
export function generateComparisonInternalLinks(
  company1: { slug: string; name: string; industrySlug?: string | null },
  company2: { slug: string; name: string; industrySlug?: string | null },
  lang: "ro" | "en" = "ro"
): InternalLink[] {
  const links: InternalLink[] = [];

  // Links to individual company pages
  links.push({
    url: `/company/${encodeURIComponent(company1.slug)}`,
    anchorText: company1.name,
    context: lang === "ro" ? "Vezi profilul complet" : "See full profile",
  });

  links.push({
    url: `/company/${encodeURIComponent(company2.slug)}`,
    anchorText: company2.name,
    context: lang === "ro" ? "Vezi profilul complet" : "See full profile",
  });

  // Link to industry if both are in same industry
  if (company1.industrySlug && company2.industrySlug && company1.industrySlug === company2.industrySlug) {
    links.push({
      url: `/industries/${encodeURIComponent(company1.industrySlug)}`,
      anchorText: lang === "ro" ? "Vezi toate companiile din industrie" : "See all companies in industry",
      context: lang === "ro" ? "Industrie" : "Industry",
    });
  }

  return links;
}
