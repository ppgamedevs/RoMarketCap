import { getSiteUrl } from "@/lib/seo/site";

export type BreadcrumbItem = {
  name: string;
  url: string;
};

/**
 * Generate BreadcrumbList structured data (JSON-LD).
 */
export function generateBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  const base = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${base}${item.url}`,
    })),
  };
}

