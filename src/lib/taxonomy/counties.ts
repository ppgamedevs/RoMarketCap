export type County = {
  slug: string;
  ro: string;
  en: string;
};

// Starter list. Extend as needed.
export const ROMANIA_COUNTIES: County[] = [
  { slug: "alba", ro: "Alba", en: "Alba" },
  { slug: "arad", ro: "Arad", en: "Arad" },
  { slug: "arges", ro: "Argeș", en: "Argeș" },
  { slug: "bacau", ro: "Bacău", en: "Bacău" },
  { slug: "bihor", ro: "Bihor", en: "Bihor" },
  { slug: "bistrita-nasaud", ro: "Bistrița-Năsăud", en: "Bistrița-Năsăud" },
  { slug: "botosani", ro: "Botoșani", en: "Botoșani" },
  { slug: "brasov", ro: "Brașov", en: "Brașov" },
  { slug: "braila", ro: "Brăila", en: "Brăila" },
  { slug: "buzau", ro: "Buzău", en: "Buzău" },
  { slug: "caras-severin", ro: "Caraș-Severin", en: "Caraș-Severin" },
  { slug: "calarasi", ro: "Călărași", en: "Călărași" },
  { slug: "cluj", ro: "Cluj", en: "Cluj" },
  { slug: "constanta", ro: "Constanța", en: "Constanța" },
  { slug: "covasna", ro: "Covasna", en: "Covasna" },
  { slug: "dambovita", ro: "Dâmbovița", en: "Dâmbovița" },
  { slug: "dolj", ro: "Dolj", en: "Dolj" },
  { slug: "galati", ro: "Galați", en: "Galați" },
  { slug: "giurgiu", ro: "Giurgiu", en: "Giurgiu" },
  { slug: "gorj", ro: "Gorj", en: "Gorj" },
  { slug: "harghita", ro: "Harghita", en: "Harghita" },
  { slug: "hunedoara", ro: "Hunedoara", en: "Hunedoara" },
  { slug: "ialomita", ro: "Ialomița", en: "Ialomița" },
  { slug: "iasi", ro: "Iași", en: "Iași" },
  { slug: "ilfov", ro: "Ilfov", en: "Ilfov" },
  { slug: "maramures", ro: "Maramureș", en: "Maramureș" },
  { slug: "mehedinti", ro: "Mehedinți", en: "Mehedinți" },
  { slug: "mures", ro: "Mureș", en: "Mureș" },
  { slug: "neamt", ro: "Neamț", en: "Neamț" },
  { slug: "olt", ro: "Olt", en: "Olt" },
  { slug: "prahova", ro: "Prahova", en: "Prahova" },
  { slug: "satu-mare", ro: "Satu Mare", en: "Satu Mare" },
  { slug: "salaj", ro: "Sălaj", en: "Sălaj" },
  { slug: "sibiu", ro: "Sibiu", en: "Sibiu" },
  { slug: "suceava", ro: "Suceava", en: "Suceava" },
  { slug: "teleorman", ro: "Teleorman", en: "Teleorman" },
  { slug: "timis", ro: "Timiș", en: "Timiș" },
  { slug: "tulcea", ro: "Tulcea", en: "Tulcea" },
  { slug: "vaslui", ro: "Vaslui", en: "Vaslui" },
  { slug: "valcea", ro: "Vâlcea", en: "Vâlcea" },
  { slug: "vrancea", ro: "Vrancea", en: "Vrancea" },
  { slug: "bucuresti", ro: "București", en: "Bucharest" }
];

export function countyLabel(slug: string, lang: "ro" | "en"): string {
  const c = ROMANIA_COUNTIES.find((x) => x.slug === slug);
  if (!c) return slug;
  return lang === "en" ? c.en : c.ro;
}


