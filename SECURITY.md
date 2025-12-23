# Security Policy (Baseline)

RoMarketCap.ro is a production-grade, SEO-first web app. This file defines baseline security expectations (design-level on Day 1).

## Reporting a Vulnerability

- Please do not open public issues for security reports.
- Contact: `security@romarketcap.ro` (placeholder; set real address before launch).
- Include: reproduction steps, impacted endpoints, and any proof-of-concept.

## Baseline Rules

- **Input validation**: All external input (query params, route params, headers, body) must be validated (zod) at the boundary.
- **AuthZ**: Sensitive reads/writes require explicit authorization checks; default-deny.
- **Rate limiting**: Apply rate limits to search, auth, claims, and intent signals (design in `docs/security.md`).
- **Audit logging**: Record sensitive actions (admin changes, claim decisions, subscription updates).
- **Secrets**: Never commit secrets. Use Vercel env vars; keep `.env` local only.
- **PII minimization**: Collect only what is necessary. Prefer aggregated signals over raw personal data.


