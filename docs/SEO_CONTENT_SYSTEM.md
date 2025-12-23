# SEO Content Machine Architecture

**Last Updated:** 2024  
**Status:** Architecture Locked

---

## Overview

RoMarketCap's SEO content system is programmatic, scalable, and data-driven. We don't write articles manually—we generate structured content from our database using templates and rules.

---

## Core Principles

1. **Data-Driven:** All content is generated from our company database
2. **Programmatic:** Templates + data = content (no manual writing)
3. **Scalable:** Can generate thousands of pages automatically
4. **Structured:** Consistent schema, internal linking, and formatting
5. **Authoritative:** Citations, data sources, and methodology transparency

---

## Content Types

### 1. Company Explainers
**Purpose:** Provide comprehensive information about individual companies  
**URL Template:** `/company/[slug]`  
**Data Source:** Company database + enrichment data  
**Update Frequency:** Daily (as data updates)

### 2. Industry Overviews
**Purpose:** Market analysis for specific industries  
**URL Template:** `/industries/[slug]`  
**Data Source:** Aggregated company data by industry  
**Update Frequency:** Weekly

### 3. County Economies
**Purpose:** Regional economic analysis  
**URL Template:** `/counties/[slug]`  
**Data Source:** Aggregated company data by county  
**Update Frequency:** Weekly

### 4. Market Movers Commentary
**Purpose:** Analysis of companies with significant ROMC score changes  
**URL Template:** `/movers` (main), `/movers/[period]` (archived)  
**Data Source:** Company score history  
**Update Frequency:** Daily

### 5. Digest Summaries
**Purpose:** Weekly market digest with commentary  
**URL Template:** `/digest/[week-start-date]`  
**Data Source:** Weekly aggregated data + AI commentary  
**Update Frequency:** Weekly

### 6. Programmatic Landing Pages
**Purpose:** SEO-optimized landing pages for specific queries  
**URL Templates:**
- `/top/[industry]` - Top companies by industry
- `/top/[county]` - Top companies by county
- `/new/[industry]` - New companies by industry
- `/new/[county]` - New companies by county
**Data Source:** Filtered company lists  
**Update Frequency:** Daily

---

## URL Templates & Structure

### Base URL Structure
```
https://romarketcap.ro/[type]/[slug]
```

### URL Components

**Type:** `company`, `industries`, `counties`, `top`, `new`, `digest`, `movers`  
**Slug:** URL-friendly identifier (e.g., `bitdefender-srl`, `software`, `bucuresti`)

### URL Rules

1. **Slugs are stable:** Never change once created
2. **Canonical URLs:** Always use canonical slug (redirect old slugs)
3. **Lowercase:** All slugs are lowercase
4. **Hyphenated:** Use hyphens, not underscores
5. **No special chars:** Only alphanumeric and hyphens

### Example URLs

```
/company/bitdefender-srl
/industries/software
/counties/bucuresti
/top/software
/new/bucuresti
/digest/2024-01-15
/movers
```

---

## Programmatic Article Schema

### Company Explainer Schema

```typescript
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": string,
  "url": string,
  "address": {
    "@type": "PostalAddress",
    "addressLocality": string,
    "addressRegion": string,
    "addressCountry": "RO"
  },
  "foundingDate": string,
  "numberOfEmployees": number,
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": number, // ROMC score
    "bestRating": 100,
    "worstRating": 0
  },
  "additionalProperty": [
    {
      "@type": "PropertyValue",
      "name": "ROMC Score",
      "value": number
    },
    {
      "@type": "PropertyValue",
      "name": "Data Confidence",
      "value": number
    },
    {
      "@type": "PropertyValue",
      "name": "Integrity Score",
      "value": number
    }
  ]
}
```

### Industry Overview Schema

```typescript
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": string, // "Top Software Companies in Romania"
  "numberOfItems": number,
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": number,
      "url": string,
      "name": string
    }
  ],
  "about": {
    "@type": "Thing",
    "name": string // Industry name
  }
}
```

### Digest Schema

```typescript
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": string,
  "datePublished": string,
  "dateModified": string,
  "author": {
    "@type": "Organization",
    "name": "RoMarketCap"
  },
  "publisher": {
    "@type": "Organization",
    "name": "RoMarketCap",
    "url": "https://romarketcap.ro"
  },
  "mainEntityOfPage": string,
  "articleBody": string // HTML content
}
```

---

## Internal Linking Rules

### Link Hierarchy

1. **Homepage** → Links to: `/companies`, `/industries`, `/counties`, `/movers`, `/digest`
2. **Company Pages** → Links to: Industry page, County page, Related companies
3. **Industry Pages** → Links to: Top companies, New companies, Related industries
4. **County Pages** → Links to: Top companies, New companies, Related counties
5. **Digest Pages** → Links to: Featured companies, Industry pages, County pages

### Link Rules

1. **Contextual:** Links must be contextually relevant
2. **Natural:** Links should feel natural, not forced
3. **Relevant:** Only link to related content
4. **Limited:** Max 10-15 internal links per page
5. **Anchor Text:** Use descriptive anchor text (not "click here")

### Link Patterns

**Company → Industry:**
```html
<a href="/industries/software">Software industry</a>
```

**Company → County:**
```html
<a href="/counties/bucuresti">Bucharest</a>
```

**Industry → Top Companies:**
```html
<a href="/top/software">Top software companies</a>
```

**Digest → Companies:**
```html
<a href="/company/bitdefender-srl">Bitdefender</a>
```

---

## Authoritativeness Signals

### 1. Data Citations
- Link to source data (ANAF, public records)
- Show data freshness ("Last updated: [date]")
- Display data confidence scores
- Link to methodology page

### 2. Structured Data
- Use JSON-LD schema markup
- Include Organization, ItemList, BreadcrumbList schemas
- Add FAQ schema where relevant
- Use proper meta tags

### 3. Internal Authority
- Link to related authoritative pages
- Show company counts and statistics
- Display market trends and analysis
- Reference methodology and sources

### 4. External Authority
- Link to official sources (ANAF, government sites)
- Reference industry reports
- Cite news articles (where relevant)
- Link to company websites

### 5. Freshness Signals
- Show "Last updated" dates
- Display "Last scored" timestamps
- Indicate data freshness badges
- Update content regularly

---

## Content Generation Rules

### Company Explainers

**Template Structure:**
1. Hero section (name, ROMC score, key metrics)
2. Overview (description, industry, location)
3. Key Metrics (ROMC score, confidence, integrity)
4. Financial Data (revenue, profit, employees)
5. Forecasts (90/180 day projections)
6. Related Companies (same industry/county)
7. FAQ section
8. "Cite this data" block

**Generation Rules:**
- Generate for all public companies
- Update daily when data changes
- Include canonical URL
- Add breadcrumb navigation
- Include structured data

### Industry Overviews

**Template Structure:**
1. Hero section (industry name, company count)
2. Market Overview (total companies, avg ROMC score)
3. Top Companies (ranked by ROMC score)
4. Market Trends (growth, movements)
5. County Distribution (companies by county)
6. Related Industries
7. FAQ section

**Generation Rules:**
- Generate for all industries with 5+ companies
- Update weekly
- Include ItemList schema
- Link to top/new company pages
- Add industry-specific FAQs

### County Economies

**Template Structure:**
1. Hero section (county name, company count)
2. Economic Overview (total companies, avg ROMC score)
3. Top Companies (ranked by ROMC score)
4. Industry Distribution (companies by industry)
5. Market Trends (growth, movements)
6. Related Counties
7. FAQ section

**Generation Rules:**
- Generate for all counties with 5+ companies
- Update weekly
- Include ItemList schema
- Link to top/new company pages
- Add county-specific FAQs

### Market Movers Commentary

**Template Structure:**
1. Hero section (period, total movers)
2. Top Increases (companies with biggest ROMC gains)
3. Top Decreases (companies with biggest ROMC losses)
4. Industry Analysis (which industries moved most)
5. County Analysis (which counties moved most)
6. Methodology note
7. Archive links

**Generation Rules:**
- Generate daily for last 30 days
- Archive weekly versions
- Include ItemList schema
- Link to company pages
- Add trend analysis

### Digest Summaries

**Template Structure:**
1. Hero section (week dates, summary)
2. Top Movers (biggest ROMC changes)
3. Industry Trends (industries in focus)
4. County Trends (counties in focus)
5. Featured Companies (notable companies)
6. Methodology note
7. Newsletter CTA

**Generation Rules:**
- Generate weekly (every Monday)
- Include BlogPosting schema
- Link to company/industry/county pages
- Add AI-generated commentary
- Include newsletter signup

---

## Content Quality Rules

### Minimum Requirements

1. **Data Completeness:**
   - Company pages: Must have name, CUI, industry, county
   - Industry pages: Must have 5+ companies
   - County pages: Must have 5+ companies

2. **Freshness:**
   - Company pages: Updated within 7 days
   - Industry/County pages: Updated within 30 days
   - Digest pages: Generated weekly

3. **Structured Data:**
   - All pages must have JSON-LD schema
   - Company pages: Organization schema
   - List pages: ItemList schema
   - Digest pages: BlogPosting schema

4. **Internal Links:**
   - Company pages: 3-5 internal links
   - Industry/County pages: 5-10 internal links
   - Digest pages: 10-15 internal links

5. **Meta Tags:**
   - Unique title tags
   - Descriptive meta descriptions
   - Canonical URLs
   - Open Graph tags
   - Twitter Card tags

### Quality Gates

**Before Indexing:**
- ✅ Minimum data completeness
- ✅ Structured data present
- ✅ Internal links present
- ✅ Meta tags present
- ✅ Canonical URL set
- ✅ No duplicate content

**Before Publishing:**
- ✅ Content passes linting
- ✅ Images optimized
- ✅ Links validated
- ✅ Schema validated
- ✅ Mobile responsive

---

## Content Update Strategy

### Daily Updates
- Company pages (as data changes)
- Market movers page
- Top/new programmatic pages

### Weekly Updates
- Industry overviews
- County economies
- Digest summaries
- Newsletter content

### Monthly Updates
- Market trend analysis
- Industry deep dives
- County economic reports

### Quarterly Updates
- Comprehensive market reports
- Industry benchmarks
- County comparisons

---

## Content Automation

### Generation Pipeline

1. **Data Collection:** Gather company data from database
2. **Template Selection:** Choose appropriate template
3. **Content Generation:** Fill template with data
4. **Schema Injection:** Add structured data
5. **Link Injection:** Add internal links
6. **Quality Check:** Validate content quality
7. **Publishing:** Generate static pages or cache

### Automation Rules

- **Trigger:** Data update, time-based schedule, or manual trigger
- **Scope:** Single page, category, or full site
- **Validation:** Check data completeness, schema validity, link health
- **Publishing:** Generate HTML, update sitemap, invalidate cache

---

## Sitemap Strategy

### Sitemap Structure

1. **Static Pages:** `/sitemaps/static.xml`
   - Homepage, about, pricing, etc.
   - Industry/county index pages
   - Programmatic landing pages

2. **Company Pages:** `/sitemaps/companies-[n].xml`
   - Chunked by 20,000 companies per sitemap
   - Only public, non-demo companies
   - Updated daily

3. **Digest Pages:** `/sitemaps/digests.xml`
   - All weekly digest issues
   - Updated weekly

### Sitemap Rules

- **Lastmod:** Use actual last update date
- **Priority:** Homepage (1.0), Company pages (0.8), Others (0.6)
- **Changefreq:** Daily for companies, weekly for others
- **Exclusions:** Demo companies, hidden companies, admin pages

---

## Content Performance Tracking

### Metrics to Track

1. **Indexation:**
   - Pages indexed by Google
   - Indexation rate by content type
   - Indexation errors

2. **Traffic:**
   - Organic traffic by content type
   - Top performing pages
   - Traffic trends

3. **Engagement:**
   - Time on page
   - Bounce rate
   - Internal link clicks

4. **Conversions:**
   - Newsletter signups by page
   - Premium conversions by page
   - API signups by page

### Tracking Implementation

- Google Search Console for indexation
- Plausible Analytics for traffic
- Custom events for conversions
- Internal analytics for engagement

---

## Content Expansion Strategy

### Phase 1: Foundation (Current)
- Company explainers
- Industry overviews
- County economies
- Market movers
- Digest summaries

### Phase 2: Expansion (Next)
- Company comparisons
- Industry deep dives
- County economic reports
- Market trend analysis
- Founder interviews (manual)

### Phase 3: Advanced (Future)
- AI-generated market commentary
- Predictive market analysis
- Competitive intelligence reports
- Custom market reports
- API-generated content

---

## Content Governance

### Ownership
- **Product Team:** Content structure and templates
- **Engineering:** Content generation and automation
- **Marketing:** Content strategy and optimization
- **Data Team:** Data quality and freshness

### Review Process
- **Automated:** Quality gates and validation
- **Weekly:** Content performance review
- **Monthly:** Content strategy review
- **Quarterly:** Content expansion planning

### Maintenance
- **Daily:** Data updates and error monitoring
- **Weekly:** Content freshness checks
- **Monthly:** Link health and schema validation
- **Quarterly:** Content audit and optimization

---

## Content Templates

### Company Explainer Template

```markdown
# [Company Name]

**ROMC Score:** [Score]/100  
**Industry:** [Industry]  
**County:** [County]  
**Founded:** [Year]

## Overview
[Company description]

## Key Metrics
- ROMC Score: [Score]
- Data Confidence: [Confidence]%
- Integrity Score: [Integrity]/100

## Financial Data
- Revenue: [Revenue]
- Profit: [Profit]
- Employees: [Employees]

## Forecasts
- 90-day projection: [Forecast]
- 180-day projection: [Forecast]

## Related Companies
- [Link to industry page]
- [Link to county page]
- [Link to related companies]

## FAQ
[Industry-specific FAQs]

## Cite This Data
[Citation block]
```

### Industry Overview Template

```markdown
# [Industry Name] Companies in Romania

**Total Companies:** [Count]  
**Average ROMC Score:** [Score]

## Market Overview
[Industry analysis]

## Top Companies
1. [Company] - ROMC: [Score]
2. [Company] - ROMC: [Score]
...

## Market Trends
[Trend analysis]

## County Distribution
[County breakdown]

## Related Industries
[Related industry links]

## FAQ
[Industry-specific FAQs]
```

---

## Content Rules Summary

### DO:
✅ Generate content from database  
✅ Use consistent templates  
✅ Include structured data  
✅ Add internal links  
✅ Update regularly  
✅ Show data sources  
✅ Include citations  

### DON'T:
❌ Write content manually  
❌ Duplicate content  
❌ Use thin content (< 300 words)  
❌ Skip structured data  
❌ Ignore internal links  
❌ Publish stale data  
❌ Make unsubstantiated claims  

---

**This SEO content system architecture is LOCKED. All content generation must follow these rules and templates.**

