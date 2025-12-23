export function slugifyCompanyName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/--+/g, "-");
}

export function slugifyTaxonomy(input: string): string {
  return slugifyCompanyName(input);
}

export function makeCompanySlug(name: string, cuiOrFallback: string): string {
  const base = slugifyCompanyName(name);
  const suffix = slugifyCompanyName(String(cuiOrFallback));
  return suffix ? `${base}-${suffix}` : base;
}


