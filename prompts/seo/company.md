# Company Page SEO Generation Prompt

**Content Type:** Company Explainer  
**URL Pattern:** `/company/[slug]`  
**Purpose:** Provide comprehensive, authoritative information about individual companies

---

## Tone Guidelines

### Voice
- **Authoritative but accessible** - We know data, but explain it clearly
- **Factual and neutral** - No hype, no opinions, just facts
- **Professional but human** - Not corporate jargon, but not casual
- **Transparent** - Show methodology, admit limitations

### Writing Style
- Use third person ("The company", "Bitdefender", not "you")
- Active voice preferred ("The company operates" not "Operations are conducted")
- Short sentences (15-20 words max)
- Clear, direct language
- No fluff or filler

---

## Forbidden Phrases

### Never Use:
- ❌ "Leading company" (unless verifiable)
- ❌ "Best in class" (subjective)
- ❌ "Revolutionary" or "innovative" (unless cited)
- ❌ "Trusted by thousands" (unless data-backed)
- ❌ "Industry leader" (unless ranked #1)
- ❌ "Award-winning" (unless specific award mentioned)
- ❌ "Fast-growing" (unless growth data provided)
- ❌ "Established" (vague - use founding year instead)
- ❌ "Experienced team" (unless team data available)
- ❌ "Comprehensive solutions" (vague marketing speak)
- ❌ "Customer-focused" (meaningless without proof)
- ❌ "Cutting-edge technology" (unless specific tech mentioned)
- ❌ Financial advice language ("invest in", "buy", "recommend")
- ❌ Investment claims ("high return", "guaranteed", "safe")

### Instead Use:
- ✅ "Founded in [year]"
- ✅ "ROMC score of [X]/100"
- ✅ "Operates in [industry]"
- ✅ "Based in [county]"
- ✅ "Revenue of [amount]"
- ✅ "Employing [number] people"
- ✅ Data-backed statements only

---

## Data Grounding Rules

### Required Data Points
1. **Company Name** - Legal name and trade name (if different)
2. **CUI** - Romanian unique identifier (if available)
3. **Industry** - CAEN code and description
4. **County** - Location (county and city)
5. **Founded Year** - Year of establishment
6. **ROMC Score** - Current score (0-100)
7. **Data Confidence** - Confidence level (0-100%)
8. **Integrity Score** - Integrity rating (0-100)
9. **Revenue** - Latest revenue figure (if available)
10. **Employees** - Employee count (if available)

### Data Usage Rules
1. **Always cite sources** - "According to ANAF data" or "Public records show"
2. **Show freshness** - "Last updated: [date]" or "Data as of [date]"
3. **Admit gaps** - "Revenue data not available" not "Revenue unknown"
4. **Use ranges** - "€1M - €5M" when exact figure unavailable
5. **Qualify estimates** - "Estimated revenue" not "Revenue"
6. **Show confidence** - "High confidence" vs "Low confidence" data

### Data Hierarchy
1. **Official sources** - ANAF, public records (highest priority)
2. **Enriched data** - Web scraping, APIs (medium priority)
3. **User-submitted** - Claims, submissions (lowest priority, marked)

---

## Content Structure

### 1. Hero Section (50-100 words)
- Company name
- ROMC score prominently displayed
- One-sentence description
- Key metrics (industry, county, founded year)

### 2. Overview Section (100-200 words)
- Company description (from database or generated)
- Industry context
- Location context
- Founding story (if available)

### 3. Key Metrics Section (100-150 words)
- ROMC score with explanation
- Data confidence level
- Integrity score
- Last updated timestamp

### 4. Financial Data Section (50-150 words)
- Revenue (if available)
- Profit (if available)
- Employees (if available)
- Financial trends (if historical data available)

### 5. Forecasts Section (50-100 words)
- 90-day ROMC forecast
- 180-day ROMC forecast
- Forecast confidence
- Methodology note

### 6. Related Companies Section (50-100 words)
- Links to top companies in same industry
- Links to top companies in same county
- "See all [industry] companies" link

### 7. FAQ Section (100-200 words)
- 3-5 industry-specific FAQs
- Use FAQ templates from `src/lib/seo/faq-templates.ts`
- Answers should be factual and data-backed

### 8. Cite This Data Block (50 words)
- Citation format
- Data source attribution
- Last updated date
- Link to methodology

**Total Length:** 550-950 words (minimum 300 words for SEO)

---

## CTA Insertion Logic

### Primary CTA (Above the fold)
- **For unclaimed companies:** "Claim this company" button
- **For claimed companies:** "View dashboard" button
- **For all:** "Improve your score" link (if user is logged in)

### Secondary CTAs (Within content)
- **After ROMC score:** "See how investors see you" (premium gate)
- **After forecasts:** "Unlock full forecast" (premium gate)
- **After financial data:** "Update company data" (claim CTA)

### Tertiary CTAs (Bottom of page)
- **Newsletter CTA:** "Get weekly market updates"
- **Premium CTA:** "Upgrade to Premium"
- **API CTA:** "Need API access?" (for B2B users)

### CTA Rules
1. **Maximum 3 CTAs per page** (1 primary, 2 secondary)
2. **Contextual placement** - CTAs must relate to nearby content
3. **Clear value prop** - Each CTA must explain benefit
4. **No pressure** - Soft language, not pushy

---

## SEO Optimization Rules

### Title Tag
- Format: `[Company Name] - ROMC Score [X]/100 | RoMarketCap`
- Max 60 characters
- Include ROMC score
- Include location if space allows

### Meta Description
- Format: `[Company Name] is a [industry] company based in [county], Romania. ROMC score: [X]/100. [One key metric]. View complete company data on RoMarketCap.`
- Max 160 characters
- Include ROMC score
- Include location
- Include call to action

### H1 Tag
- Format: `[Company Name]`
- Single H1 per page
- Company name only (no extra text)

### H2 Tags
- "Overview"
- "Key Metrics"
- "Financial Data"
- "Forecasts"
- "Related Companies"
- "FAQ"

### Internal Links
- Minimum 3 internal links
- Maximum 10 internal links
- Link to:
  - Industry page
  - County page
  - Related companies (2-3)
  - Top/new pages for industry/county
  - Methodology page
  - About page

### External Links
- Company website (if available)
- Official sources (ANAF, public records)
- Maximum 3 external links
- All external links: `rel="nofollow"`

---

## Structured Data Requirements

### Organization Schema
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "[Company Name]",
  "url": "[Company Website]",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "[City]",
    "addressRegion": "[County]",
    "addressCountry": "RO"
  },
  "foundingDate": "[Year]",
  "numberOfEmployees": "[Number]",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "[ROMC Score]",
    "bestRating": 100,
    "worstRating": 0
  }
}
```

### BreadcrumbList Schema
```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Home",
      "item": "https://romarketcap.ro"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "[Company Name]",
      "item": "https://romarketcap.ro/company/[slug]"
    }
  ]
}
```

---

## Quality Checklist

Before generating content, verify:
- ✅ All required data points available
- ✅ ROMC score is current (within 7 days)
- ✅ Data confidence is acceptable (>50%)
- ✅ No forbidden phrases used
- ✅ All claims are data-backed
- ✅ Internal links are relevant
- ✅ Structured data is valid
- ✅ CTAs are contextual
- ✅ Content length meets minimum (300 words)
- ✅ Meta tags are optimized
- ✅ Canonical URL is set

---

## Example Output Structure

```markdown
# Bitdefender SRL

**ROMC Score:** 85/100  
**Industry:** Software  
**County:** Bucharest  
**Founded:** 2001

## Overview

Bitdefender is a cybersecurity software company based in Bucharest, Romania. Founded in 2001, the company operates in the software industry and has achieved a ROMC score of 85/100, indicating strong market position and growth potential.

[Continue with sections...]
```

---

**This prompt is LOCKED. All company page content generation must follow these rules.**

