# Privacy & Security Documentation

## CSRF Protection

**Implementation:**
- Double-submit cookie pattern
- Token set via `/api/csrf` endpoint
- Validated on mutation routes

**Protected Routes:**
- `/api/dashboard/alerts/rules` (POST)
- `/api/dashboard/alerts/rules/[id]` (PUT/DELETE)
- `/api/dashboard/comparisons` (POST)
- `/api/dashboard/comparisons/[id]` (PUT/DELETE)
- `/api/watchlist/toggle` (POST)
- `/api/watchlist/settings` (PUT)
- `/api/settings/notifications` (PUT)
- `/api/settings/delete` (POST)
- `/api/company/[cui]/submit` (POST)
- `/api/company/[cui]/claim` (POST)
- `/api/corrections/request` (POST)
- `/api/partners/lead` (POST)

**Client Usage:**
```typescript
import { fetchWithCsrf } from "@/src/lib/csrf/client";
await fetchWithCsrf("/api/company/123/submit", { method: "POST", body: ... });
```

## Content Security Policy

**Headers:**
- `Content-Security-Policy`: Restricts script sources, inline scripts, etc.
- Configured in `next.config.ts`

**Policy:**
- Default: `self` only
- Scripts: `self`, `unsafe-inline`, `unsafe-eval` (for Next.js), `plausible.io`
- Styles: `self`, `unsafe-inline`
- Images: `self`, `data:`, `https:`
- Fonts: `self`, `data:`
- Connect: `self`, `plausible.io`
- Frame ancestors: `none`

## Permissions Policy

**Headers:**
- `Permissions-Policy`: Disables unnecessary browser features

**Disabled:**
- Geolocation
- Microphone
- Camera
- Payment
- USB
- Magnetometer
- Gyroscope
- Accelerometer

## Data Retention

### User Data
- **Accounts:** Retained while account is active
- **Sessions:** Auto-expire (NextAuth default)
- **Watchlists:** Retained while account exists
- **Alerts:** Retained while account exists

### Company Data
- **Company records:** Retained indefinitely (public data)
- **Score history:** Retained indefinitely (for trends)
- **Forecasts:** Retained indefinitely (for analysis)
- **Change logs:** Retained indefinitely (for audit)

### Audit Logs
- **AdminAuditLog:** Retained indefinitely
- **Hash-chain:** Maintained for integrity verification
- **Export:** Available via `/api/admin/audit/export`

### Demo Data
- **Demo companies:** Excluded from sitemaps when `DEMO_MODE=0`
- **Demo companies:** Can be cleared via `/admin/demo`

## GDPR Compliance

### Right to Access
- Users can view their data via `/dashboard`
- Users can export watchlist/comparisons (Premium)

### Right to Deletion
- Account deletion: `/api/settings/delete` (POST)
- Deletes: User account, sessions, watchlists, alerts, comparisons
- Preserves: Company data (public), audit logs (legal requirement)

### Data Portability
- Watchlist export: `/api/dashboard/exports/watchlist` (CSV/JSON)
- Comparisons export: `/api/dashboard/exports/comparisons` (CSV/JSON)

### Consent
- Analytics: Cookie consent banner (`CookieConsentBanner`)
- Newsletter: Explicit opt-in required
- Tracking: Plausible (privacy-friendly, no cookies)

## Security Headers

All responses include:
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Content-Security-Policy: ...`
- `Permissions-Policy: ...`

## Rate Limiting

**Standard Endpoints:**
- Anonymous: 20 req/min
- Authenticated: 120 req/min
- Premium: 240 req/min

**Expensive Endpoints:**
- Anonymous: 5 req/min
- Authenticated: 30 req/min
- Premium: 60 req/min

**Admin Routes:**
- 10 req/min per IP

**Headers:**
- `RateLimit-Limit`
- `RateLimit-Remaining`
- `RateLimit-Reset`
- `Retry-After`

## Authentication

**Provider:**
- NextAuth.js with GitHub OAuth
- Database sessions (Prisma adapter)

**Admin Access:**
- Allowlist via `ADMIN_EMAILS` env var
- Role persisted in `User.role`
- Middleware enforces admin routes

**Session Security:**
- HttpOnly cookies
- Secure cookies (production)
- SameSite: Lax

## API Keys

**Storage:**
- Hashed with `NEXTAUTH_SECRET`
- Only last 4 characters stored in plaintext

**Plans:**
- FREE: Limited rate limits
- PARTNER: Higher rate limits
- PREMIUM: Highest rate limits

**Validation:**
- Lookup via `getApiKeyContext()`
- Rate limiting per key

## Audit Trail

**Immutable Logs:**
- All admin actions logged
- Hash-chain for integrity
- Exportable as CSV

**Logged Actions:**
- Flag toggles
- API key creation/deletion
- Submission/claim approvals
- Billing actions
- Demo seed/clear

## Incident Response

See `RUNBOOK.md` for incident procedures.

## Contact

For security issues:
- Review audit logs: `/admin/audit`
- Check Sentry for errors
- Review rate limit violations

