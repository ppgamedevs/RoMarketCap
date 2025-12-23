# SEO Strategy (Baseline, Day 1)

## Non-negotiables

- **Localized routes**:
  - RO default: `/ro/companii/[slug]`
  - EN optional: `/en/companies/[slug]`
- **hreflang + canonical** on every indexable page.
- **MetadataBase** configured via `NEXT_PUBLIC_SITE_URL` (Vercel-friendly).
- **Sitemaps**: start minimal, then scale to segmented sitemaps + index.

## Day 1 implementation

- `lib/seo/metadata.ts`: default metadata + entity metadata with:
  - canonical URL
  - `alternates.languages` for `ro` and `en`
- `app/robots.ts` and `app/sitemap.ts`: minimal baseline.

## Hreflang strategy

- **RO is the default**; EN is an alternate.
- For each entity page:
  - canonical = current locale path
  - alternates.languages = both locale paths for the same entity

## What comes later (planned)

- Segmented sitemaps:
  - `/sitemap.xml` -> sitemap index
  - `/sitemaps/companies-1.xml`, `/sitemaps/cities-1.xml`, ...
- Programmatic content templates + schema.org markup per page type.
- Internal linking strategy (cities, sectors, CAEN codes, rankings).
- Robots policy refinement as crawling load increases.


