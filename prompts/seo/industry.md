# Industry Page SEO Generation Prompt

**Content Type:** Industry Overview  
**URL Pattern:** `/industries/[slug]`  
**Purpose:** Provide comprehensive market analysis for specific industries

---

## Tone Guidelines

### Voice
- **Analytical and authoritative** - Market intelligence, not marketing
- **Data-driven** - Let numbers tell the story
- **Comparative** - Show industry context and benchmarks
- **Educational** - Help readers understand the market

### Writing Style
- Use third person ("The software industry", "Companies in this sector")
- Present tense for current state, past tense for trends
- Short paragraphs (3-4 sentences max)
- Bullet points for lists and statistics
- Clear section headers

---

## Forbidden Phrases

### Never Use:
- ❌ "Thriving industry" (subjective)
- ❌ "Booming market" (unless data-backed)
- ❌ "Competitive landscape" (vague - use specific data)
- ❌ "Market leaders" (unless ranked)
- ❌ "Emerging sector" (unless defined)
- ❌ "High growth potential" (unless forecasted)
- ❌ "Innovative companies" (meaningless)
- ❌ "Disruptive technology" (overused)
- ❌ "Market opportunity" (vague)
- ❌ Investment advice ("invest in", "buy stocks")
- ❌ Comparative claims without data ("better than", "superior to")

### Instead Use:
- ✅ "The [industry] industry in Romania"
- ✅ "[X] companies operate in this sector"
- ✅ "Average ROMC score: [X]/100"
- ✅ "Top companies include [names]"
- ✅ Data-backed statements only

---

## Data Grounding Rules

### Required Data Points
1. **Industry Name** - Official CAEN description
2. **Company Count** - Total companies in industry
3. **Average ROMC Score** - Mean score for industry
4. **Top Companies** - Top 10 by ROMC score
5. **County Distribution** - Companies by county
6. **Growth Trends** - ROMC score changes over time
7. **New Companies** - Recently added companies
8. **Market Movers** - Companies with significant score changes

### Data Usage Rules
1. **Always show sample size** - "Based on [X] companies"
2. **Use averages, not extremes** - "Average ROMC score" not "Highest score"
3. **Show distribution** - "Scores range from [X] to [Y]"
4. **Cite timeframes** - "In the last 30 days" or "As of [date]"
5. **Qualify statistics** - "Among companies with data" not "All companies"
6. **Show confidence** - "High confidence data" vs "Estimated"

### Data Hierarchy
1. **Aggregated company data** - Sums, averages, counts
2. **Historical trends** - Score changes over time
3. **Comparative data** - Industry vs overall market
4. **Forecast data** - Projected trends (clearly marked)

---

## Content Structure

### 1. Hero Section (50-100 words)
- Industry name
- Total company count
- Average ROMC score
- One-sentence market overview

### 2. Market Overview Section (150-250 words)
- Industry description
- Market size (company count)
- Average ROMC score with context
- Score distribution (high/medium/low)
- Key characteristics of the industry

### 3. Top Companies Section (100-150 words)
- List top 10 companies by ROMC score
- Include ROMC scores
- Link to company pages
- Brief note on what makes them top performers

### 4. Market Trends Section (100-200 words)
- ROMC score trends (increasing/decreasing)
- Growth companies (biggest movers)
- New companies added
- Industry-specific trends

### 5. County Distribution Section (100-150 words)
- Top counties by company count
- Geographic concentration
- Link to county pages
- Regional insights

### 6. Related Industries Section (50-100 words)
- Similar or adjacent industries
- Link to related industry pages
- Cross-industry insights

### 7. FAQ Section (150-250 words)
- 5-7 industry-specific FAQs
- Use FAQ templates from `src/lib/seo/faq-templates.ts`
- Answers should be data-backed and helpful

**Total Length:** 700-1,200 words (minimum 500 words for SEO)

---

## CTA Insertion Logic

### Primary CTA (Above the fold)
- **"View all [industry] companies"** - Link to filtered company directory
- **"Get weekly [industry] updates"** - Newsletter signup with industry filter

### Secondary CTAs (Within content)
- **After top companies:** "See full rankings" (link to `/top/[industry]`)
- **After new companies:** "Track new [industry] companies" (premium gate)
- **After trends:** "Get [industry] alerts" (premium gate)

### Tertiary CTAs (Bottom of page)
- **Newsletter CTA:** "Get weekly market digest"
- **Premium CTA:** "Upgrade for advanced [industry] filters"
- **API CTA:** "Need [industry] data via API?" (for B2B users)

### CTA Rules
1. **Maximum 3 CTAs per page** (1 primary, 2 secondary)
2. **Industry-specific** - CTAs should reference the industry
3. **Clear value prop** - Explain benefit for this industry
4. **No pressure** - Soft language, helpful tone

---

## SEO Optimization Rules

### Title Tag
- Format: `[Industry Name] Companies in Romania - [X] Companies | RoMarketCap`
- Max 60 characters
- Include company count
- Include location (Romania)

### Meta Description
- Format: `[X] companies operate in the [industry] industry in Romania. Average ROMC score: [X]/100. View top companies, trends, and market analysis on RoMarketCap.`
- Max 160 characters
- Include company count
- Include average ROMC score
- Include call to action

### H1 Tag
- Format: `[Industry Name] Companies in Romania`
- Include location for SEO
- Industry name only (no extra text)

### H2 Tags
- "Market Overview"
- "Top Companies"
- "Market Trends"
- "County Distribution"
- "Related Industries"
- "FAQ"

### Internal Links
- Minimum 5 internal links
- Maximum 15 internal links
- Link to:
  - Top companies (individual pages)
  - County pages (where companies are located)
  - Related industries (2-3)
  - Top/new pages for industry
  - Company directory (filtered by industry)
  - Methodology page
  - About page

### External Links
- Official industry sources (if available)
- CAEN code reference (if available)
- Maximum 2 external links
- All external links: `rel="nofollow"`

---

## Structured Data Requirements

### ItemList Schema
```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "[Industry Name] Companies in Romania",
  "numberOfItems": "[Company Count]",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "url": "[Company URL]",
      "name": "[Company Name]"
    }
  ],
  "about": {
    "@type": "Thing",
    "name": "[Industry Name]"
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
      "name": "Industries",
      "item": "https://romarketcap.ro/industries"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "[Industry Name]",
      "item": "https://romarketcap.ro/industries/[slug]"
    }
  ]
}
```

---

## Quality Checklist

Before generating content, verify:
- ✅ Minimum 5 companies in industry (for indexation)
- ✅ Average ROMC score is calculated correctly
- ✅ Top companies list is accurate
- ✅ County distribution data is available
- ✅ No forbidden phrases used
- ✅ All claims are data-backed
- ✅ Internal links are relevant
- ✅ Structured data is valid
- ✅ CTAs are industry-specific
- ✅ Content length meets minimum (500 words)
- ✅ Meta tags are optimized
- ✅ Canonical URL is set

---

## Example Output Structure

```markdown
# Software Companies in Romania

**Total Companies:** 15,234  
**Average ROMC Score:** 72/100

## Market Overview

The software industry in Romania comprises 15,234 companies, making it one of the largest sectors in the country. Companies in this industry have an average ROMC score of 72/100, indicating strong market position and growth potential.

[Continue with sections...]
```

---

**This prompt is LOCKED. All industry page content generation must follow these rules.**

