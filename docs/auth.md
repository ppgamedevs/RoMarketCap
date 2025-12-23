# Auth (Design Only, Day 1)

## Recommendation: NextAuth (Auth.js) + Prisma Adapter

Why:

- Fits Next.js App Router well
- Flexible providers (email magic link first; OAuth later)
- Supports serverless deployments (Vercel)
- Works cleanly with Prisma + Postgres

Deferred: implementation + providers + session strategy.

## Roles (conceptual)

- **guest**: not logged in (no DB record)
- **user**: free account
- **pro**: paid individual
- **business**: paid business/API tier
- **moderator**: can review claims
- **admin**: full access

DB representation (placeholder Day 1):

- `User.role` enum contains: `GUEST`, `USER`, `PRO`, `BUSINESS`, `MODERATOR`, `ADMIN`
- In practice, `GUEST` is not stored; it’s derived from “no session”.

## Authorization approach (planned)

- Default-deny.
- Centralize checks in `lib/auth/authorize.ts` (later) with helpers:
  - `requireUser()`
  - `requireRole(role)`
  - `requireAnyRole([...])`
- Route groups:
  - `app/(admin)` guarded by middleware or per-route checks
  - API routes validate session + role explicitly

## Session strategy (planned)

- Start with **database sessions** (Prisma adapter) for simplicity and revocation.
- Use **short-lived session tokens** for sensitive surfaces if needed later.


