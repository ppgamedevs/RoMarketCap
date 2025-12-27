# Setup Instructions

## ✅ Changes Made

### 1. Authentication
- Uses GitHub OAuth for user and admin authentication
- Updated `components/auth/SignInButton.tsx` to show "Sign in with GitHub"

### 2. Updated Domain to romarketcap.com
- Updated `src/lib/siteUrl.ts` - production fallback now uses `romarketcap.com`
- Updated `lib/seo/site.ts` - site name changed to "RoMarketCap.com"
- All sitemaps and metadata will use `romarketcap.com`

### 3. Upstash KV Configuration
The app uses `@vercel/kv` which works with Upstash. Add these to your `.env`:

```env
KV_REST_API_URL="https://fond-stinkbug-9202.upstash.io"
KV_REST_API_TOKEN="ASPyAAImcDFlYzVjNDdjNTYwMDY0MjU5OWYzZWJkOTE4MWZjMmFiNnAxOTIwMg"
KV_REST_API_READ_ONLY_TOKEN="AiPyAAIgcDFs49BOCR6Fqf15XU1mkcInJ4ewvy0zFrQV4LjTDAanOg"
KV_URL="rediss://default:ASPyAAImcDFlYzVjNDdjNTYwMDY0MjU5OWYzZWJkOTE4MWZjMmFiNnAxOTIwMg@fond-stinkbug-9202.upstash.io:6379"
REDIS_URL="rediss://default:ASPyAAImcDFlYzVjNDdjNTYwMDY0MjU5OWYzZWJkOTE4MWZjMmFiNnAxOTIwMg@fond-stinkbug-9202.upstash.io:6379"
```

## 🔧 Next Steps

### 1. Set Up GitHub OAuth

1. Go to [GitHub Settings → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Click "New OAuth App" (or edit existing)
3. Fill in:
   - Application name: `RoMarketCap`
   - Homepage URL: `https://romarketcap.com` (or your domain)
   - Authorization callback URL: `https://romarketcap.com/api/auth/callback/github`
     - For local dev: `http://localhost:3000/api/auth/callback/github`
4. Click "Register application"
5. Copy Client ID and Client Secret to `.env`:
   ```env
   GITHUB_CLIENT_ID="your-github-client-id"
   GITHUB_CLIENT_SECRET="your-github-client-secret"
   ```

### 2. Add All Environment Variables

Create a `.env` file with:

```env
# Database (Neon)
DATABASE_URL="your-neon-database-url"

# Site
NEXT_PUBLIC_SITE_URL="https://romarketcap.com"

# NextAuth
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://romarketcap.com"

# GitHub OAuth
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# Admin
ADMIN_EMAILS="your-email@example.com"

# Upstash KV (already provided above)
KV_REST_API_URL="https://fond-stinkbug-9202.upstash.io"
KV_REST_API_TOKEN="ASPyAAImcDFlYzVjNDdjNTYwMDY0MjU5OWYzZWJkOTE4MWZjMmFiNnAxOTIwMg"
KV_REST_API_READ_ONLY_TOKEN="AiPyAAIgcDFs49BOCR6Fqf15XU1mkcInJ4ewvy0zFrQV4LjTDAanOg"
KV_URL="rediss://default:ASPyAAImcDFlYzVjNDdjNTYwMDY0MjU5OWYzZWJkOTE4MWZjMmFiNnAxOTIwMg@fond-stinkbug-9202.upstash.io:6379"
REDIS_URL="rediss://default:ASPyAAImcDFlYzVjNDdjNTYwMDY0MjU5OWYzZWJkOTE4MWZjMmFiNnAxOTIwMg@fond-stinkbug-9202.upstash.io:6379"

# Stripe (if using)
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRICE_ID_MONTHLY="price_..."
```

### 3. Set Up Domain Redirect

In your DNS/hosting provider:
- **romarketcap.ro** → Redirect (301) to **romarketcap.com**
- **romarketcap.com** → Points to your Vercel deployment

### 4. Submit Sitemap to Google Search Console

**Sitemap URL:**
```
https://romarketcap.com/sitemap.xml
```

**Steps:**
1. Go to [Google Search Console](https://search.google.com/search-console)
2. Add property: `romarketcap.com`
3. Verify ownership
4. Go to "Sitemaps" section
5. Submit: `https://romarketcap.com/sitemap.xml`

The sitemap index includes:
- `/sitemaps/static.xml` - Static pages (home, about, pricing, etc.)
- `/sitemaps/companies-*.xml` - Company pages (automatically chunked)

## 📝 Notes

- The `@vercel/kv` package will automatically use the `KV_REST_API_URL` and `KV_REST_API_TOKEN` environment variables
- Make sure your Neon database has the migrations applied: `npm run db:migrate:dev`
- Seed the database: `npm run db:seed` (optional, for demo data)

