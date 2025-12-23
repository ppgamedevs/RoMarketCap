# Security (Baseline, Day 1)

## Input validation policy

- Validate **all** external input at boundaries using **zod**:
  - route params (`params`)
  - query string (`searchParams`)
  - request body
  - headers used for auth / webhooks
- Validation failures return **typed, non-leaky** errors (no stack traces).
- Prefer allow-lists (enums, regex, max lengths).

## Rate limiting plan (design)

Target surfaces:

- Search endpoints (high-abuse)
- Claim flows (spam)
- Intent signals (botting)
- Auth endpoints (credential stuffing)
- Webhooks (replay protection)

Plan:

- Use **Upstash Redis** (or equivalent) for serverless-friendly rate limiting.
- Key by **IP + userId** (when available).
- Use simple buckets initially:
  - burst + sustained limits
  - stricter limits for unauthenticated
- Add denylist + captcha only if needed (avoid early friction).

## Audit logging plan (design)

Write an `AuditLog` record for:

- Admin actions (edits, deletes, approvals)
- Claim approvals/rejections
- Subscription state changes
- Security events (rate-limit blocks, auth failures at scale)

Minimum fields:

- actor (userId or system)
- action
- target type/id
- IP + user agent
- timestamp
- metadata payload (JSON)

## Data & compliance notes (baseline)

- Do not store raw sensitive documents in DB; store references to object storage.
- Minimize PII; prefer aggregated intent metrics.
- Prepare for GDPR basics (policy + deletion flow) in later prompts.


