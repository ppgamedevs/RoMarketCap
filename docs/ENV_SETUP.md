# Environment Variables Setup

## Required Variables

### Database (Neon PostgreSQL)
```env
DATABASE_URL="postgresql://user:password@host:5432/database"
```

### Site URL
```env
NEXT_PUBLIC_SITE_URL="https://romarketcap.com"
```

### NextAuth
```env
NEXTAUTH_SECRET="your-secret-key-here"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="https://romarketcap.com"
```

### Admin
```env
ADMIN_EMAILS="ppgamedevs@gmail.com"  # Comma-separated list of admin emails
```

**Note:** The email `ppgamedevs@gmail.com` will automatically receive admin role on registration. Other emails in `ADMIN_EMAILS` will also be granted admin access on login.

### Upstash KV (Redis)
```env
KV_REST_API_URL="https://fond-stinkbug-9202.upstash.io"
KV_REST_API_TOKEN="ASPyAAImcDFlYzVjNDdjNTYwMDY0MjU5OWYzZWJkOTE4MWZjMmFiNnAxOTIwMg"
KV_REST_API_READ_ONLY_TOKEN="AiPyAAIgcDFs49BOCR6Fqf15XU1mkcInJ4ewvy0zFrQV4LjTDAanOg"
KV_URL="rediss://default:ASPyAAImcDFlYzVjNDdjNTYwMDY0MjU5OWYzZWJkOTE4MWZjMmFiNnAxOTIwMg@fond-stinkbug-9202.upstash.io:6379"
REDIS_URL="rediss://default:ASPyAAImcDFlYzVjNDdjNTYwMDY0MjU5OWYzZWJkOTE4MWZjMmFiNnAxOTIwMg@fond-stinkbug-9202.upstash.io:6379"
```

### Stripe
```env
STRIPE_SECRET_KEY="sk_test_..."  # or sk_live_... for production
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_MONTHLY="price_..."
```

## Optional Variables

```env
GOOGLE_SITE_VERIFICATION=""
SLACK_WEBHOOK_URL=""
```

### Company Discovery (PROMPT 54)

```env
# SEAP (Sistemul Electronic de Achiziții Publice) CSV URL
SEAP_CSV_URL="https://example.com/seap-export.csv"

# EU Funds CSV or JSON URL
EU_FUNDS_CSV_URL="https://example.com/eu-funds.csv"
# OR
EU_FUNDS_JSON_URL="https://example.com/eu-funds.json"

# Enable/disable ingestion (or use feature flag INGEST_ENABLED in KV)

### ANAF Financial Sync (PROMPT 58)

```env
# ANAF Web Service URL for financial statements (optional, has default)
ANAF_WS_BILANT_URL=https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva

# Note: The actual financial statements endpoint may differ. Update when official endpoint is available.
```
INGEST_ENABLED=1
```

## Domain Setup

- **Primary domain:** `romarketcap.com`
- **Redirect domain:** `romarketcap.ro` → redirects to `romarketcap.com`

## Sitemap for Google Search Console

Submit this URL to Google Search Console:
```
https://romarketcap.com/sitemap.xml
```

This is the sitemap index that includes:
- `/sitemaps/static.xml` - Static pages
- `/sitemaps/companies-*.xml` - Company pages (chunked)

