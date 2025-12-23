# Roadmap (Day 1–30)

This is a working outline. We keep each day shippable and avoid overengineering.

## Day 1 — Foundation (this prompt)

- Next.js + TS + Tailwind + shadcn/ui
- Folder architecture + docs
- Prisma initialized + placeholder models
- SEO + security baselines (design/utility only)

## Day 2 — Database schema v1

- Real schema design (companies, sources, provenance, history)
- Migrations
- Seed minimal data

## Day 3 — Ingestion pipeline v0

- 1 public data source connector
- Normalization + provenance
- Idempotent ingestion jobs

## Day 4 — Company directory (public, RO)

- Programmatic company pages (RO)
- Basic layout + internal links

## Day 5 — Localization (EN + switch)

- EN routes + basic translation patterns
- hreflang/canonical verification

## Day 6 — Search v0

- Basic search endpoint + UI
- Rate limiting

## Day 7 — Claim company (v0)

- Claim request flow + moderation queue
- Audit logs

## Day 8 — Admin tooling v0

- Admin dashboard skeleton
- Claim moderation UI

## Day 9 — Monetization foundation

- Stripe products + webhook skeleton
- Subscription model wiring (no paywalls yet)

## Day 10 — Paywalls v0

- Tier gating for advanced fields

## Day 11 — Observability v0

- Error tracking + structured logging
- Cron health

## Day 12 — SEO scaling v0

- Sitemap index + segmented sitemaps
- Robots refinements

## Day 13 — City pages

- `/ro/orase/[slug]` + internal linking

## Day 14 — Sector/CAEN pages

- `/ro/caen/[code]` + sector indexes

## Day 15 — Data freshness + snapshots

- Snapshot scheduling policies
- Backfill strategy

## Day 16 — Scoring v1 (simple, explainable)

- Minimal RoMC score with explanations

## Day 17 — Valuation v1 (range, conservative)

- Minimal valuation range + confidence

## Day 18 — Predictions v0 (explainable)

- Lightweight classifiers + explanations

## Day 19 — Transparency & provenance UI

- Data sources per field
- Version history entry points

## Day 20 — Public rankings (v0)

- Top lists by sector/city (clearly labeled)

## Day 21 — API tier planning

- API route design + rate limits + keys

## Day 22 — Business tier (v0)

- API key issuance + usage tracking

## Day 23 — Anti-abuse hardening

- Bot detection options
- Stricter controls on sensitive endpoints

## Day 24 — Performance pass

- Caching strategy
- Page generation performance

## Day 25 — Legal/Compliance pass

- Privacy policy, cookies, deletion flow plan

## Day 26 — Data source expansion

- Add 2nd connector

## Day 27 — Backfills + QA

- Idempotency checks
- Data integrity checks

## Day 28 — Monetization polish

- Upgrade/downgrade flows
- Webhook reliability

## Day 29 — Pre-launch SEO audit

- Canonicals/hreflang/sitemaps validation
- Indexing readiness

## Day 30 — Launch checklist

- Security review
- Monitoring + alerting
- First public release


