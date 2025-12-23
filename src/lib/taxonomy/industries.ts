export type Industry = {
  slug: string;
  ro: string;
  en: string;
};

export const STARTER_INDUSTRIES: Industry[] = [
  { slug: "software", ro: "Software", en: "Software" },
  { slug: "ecommerce", ro: "E-commerce", en: "E-commerce" },
  { slug: "logistics", ro: "Logistică", en: "Logistics" },
  { slug: "healthcare", ro: "Sănătate", en: "Healthcare" },
  { slug: "retail", ro: "Retail", en: "Retail" },
  { slug: "manufacturing", ro: "Producție", en: "Manufacturing" },
  { slug: "construction", ro: "Construcții", en: "Construction" },
  { slug: "finance", ro: "Finanțe", en: "Finance" },
  { slug: "energy", ro: "Energie", en: "Energy" },
  { slug: "agriculture", ro: "Agricultură", en: "Agriculture" },
  { slug: "hospitality", ro: "HoReCa", en: "Hospitality" },
  { slug: "education", ro: "Educație", en: "Education" }
];

export function industryLabel(slug: string, lang: "ro" | "en"): string {
  const i = STARTER_INDUSTRIES.find((x) => x.slug === slug);
  if (!i) return slug;
  return lang === "en" ? i.en : i.ro;
}


