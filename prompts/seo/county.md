# County Page SEO Generation Prompt

**Content Type:** County Economy Overview  
**URL Pattern:** `/counties/[slug]`  
**Purpose:** Provide comprehensive economic analysis for specific counties

---

## Tone Guidelines

### Voice
- **Geographic and economic** - Focus on regional context
- **Data-driven** - Economic indicators and statistics
- **Comparative** - Show county vs national averages
- **Informative** - Help readers understand regional economy

### Writing Style
- Use third person ("Bucharest", "Companies in Cluj", "The county")
- Present tense for current state
- Short paragraphs (3-4 sentences max)
- Bullet points for statistics
- Clear geographic references

---

## Forbidden Phrases

### Never Use:
- ❌ "Thriving economy" (subjective)
- ❌ "Booming region" (unless data-backed)
- ❌ "Economic hub" (unless defined)
- ❌ "Leading county" (unless ranked #1)
- ❌ "Fast-growing region" (unless growth data provided)
- ❌ "Business-friendly" (vague)
- ❌ "Strategic location" (meaningless)
- ❌ "Investment destination" (unless data-backed)
- ❌ "Emerging market" (vague)
- ❌ Investment advice ("invest here", "buy property")
- ❌ Political statements or opinions

### Instead Use:
- ✅ "[County] has [X] companies"
- ✅ "Average ROMC score: [X]/100"
- ✅ "Top industries include [names]"
- ✅ Data-backed statements only

---

## Data Grounding Rules

### Required Data Points
1. **County Name** - Official county name
2. **Company Count** - Total companies in county
3. **Average ROMC Score** - Mean score for county
4. **Top Companies** - Top 10 by ROMC score
5. **Industry Distribution** - Companies by industry
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
7. **Compare to national** - "Above/below national average"

### Data Hierarchy
1. **Aggregated company data** - Sums, averages, counts
2. **Historical trends** - Score changes over time
3. **Comparative data** - County vs national averages
4. **Forecast data** - Projected trends (clearly marked)

---

## Content Structure

### 1. Hero Section (50-100 words)
- County name
- Total company count
- Average ROMC score
- One-sentence economic overview

### 2. Economic Overview Section (150-250 words)
- County description
- Economic context
- Market size (company count)
- Average ROMC score with context
- Score distribution (high/medium/low)
- Comparison to national average

### 3. Top Companies Section (100-150 words)
- List top 10 companies by ROMC score
- Include ROMC scores
- Link to company pages
- Brief note on what makes them top performers

### 4. Industry Distribution Section (150-200 words)
- Top industries by company count
- Industry concentration
- Link to industry pages
- Industry-specific insights

### 5. Market Trends Section (100-200 words)
- ROMC score trends (increasing/decreasing)
- Growth companies (biggest movers)
- New companies added
- County-specific trends

### 6. Related Counties Section (50-100 words)
- Similar or adjacent counties
- Link to related county pages
- Cross-county insights

### 7. FAQ Section (150-250 words)
- 5-7 county-specific FAQs
- Use FAQ templates from `src/lib/seo/faq-templates.ts`
- Answers should be data-backed and helpful

**Total Length:** 700-1,200 words (minimum 500 words for SEO)

---

## CTA Insertion Logic

### Primary CTA (Above the fold)
- **"View all [county] companies"** - Link to filtered company directory
- **"Get weekly [county] updates"** - Newsletter signup with county filter

### Secondary CTAs (Within content)
- **After top companies:** "See full rankings" (link to `/top/[county]`)
- **After new companies:** "Track new [county] companies" (premium gate)
- **After trends:** "Get [county] alerts" (premium gate)

### Tertiary CTAs (Bottom of page)
- **Newsletter CTA:** "Get weekly market digest"
- **Premium CTA:** "Upgrade for advanced [county] filters"
- **API CTA:** "Need [county] data via API?" (for B2B users)

### CTA Rules
1. **Maximum 3 CTAs per page** (1 primary, 2 secondary)
2. **County-specific** - CTAs should reference the county
3. **Clear value prop** - Explain benefit for this county
4. **No pressure** - Soft language, helpful tone

---

## SEO Optimization Rules

### Title Tag
- Format: `[County Name] Companies - [X] Companies | RoMarketCap`
- Max 60 characters
- Include company count
- Include location context if space allows

### Meta Description
- Format: `[X] companies operate in [County], Romania. Average ROMC score: [X]/100. View top companies, industries, and economic analysis on RoMarketCap.`
- Max 160 characters
- Include company count
- Include average ROMC score
- Include call to action

### H1 Tag
- Format: `[County Name] Companies`
- County name only (no extra text)
- Can include "Romania" if needed for clarity

### H2 Tags
- "Economic Overview"
- "Top Companies"
- "Industry Distribution"
- "Market Trends"
- "Related Counties"
- "FAQ"

### Internal Links
- Minimum 5 internal links
- Maximum 15 internal links
- Link to:
  - Top companies (individual pages)
  - Industry pages (where companies operate)
  - Related counties (2-3)
  - Top/new pages for county
  - Company directory (filtered by county)
  - Methodology page
  - About page

### External Links
- Official county sources (if available)
- Government statistics (if available)
- Maximum 2 external links
- All external links: `rel="nofollow"`

---

## Structured Data Requirements

### ItemList Schema
```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "[County Name] Companies",
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
    "@type": "Place",
    "name": "[County Name]",
    "addressCountry": "RO"
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
      "name": "Counties",
      "item": "https://romarketcap.ro/counties"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "[County Name]",
      "item": "https://romarketcap.ro/counties/[slug]"
    }
  ]
}
```

---

## Quality Checklist

Before generating content, verify:
- ✅ Minimum 5 companies in county (for indexation)
- ✅ Average ROMC score is calculated correctly
- ✅ Top companies list is accurate
- ✅ Industry distribution data is available
- ✅ No forbidden phrases used
- ✅ All claims are data-backed
- ✅ Internal links are relevant
- ✅ Structured data is valid
- ✅ CTAs are county-specific
- ✅ Content length meets minimum (500 words)
- ✅ Meta tags are optimized
- ✅ Canonical URL is set

---

## Example Output Structure

```markdown
# Bucharest Companies

**Total Companies:** 45,678  
**Average ROMC Score:** 75/100

## Economic Overview

Bucharest, the capital of Romania, is home to 45,678 companies, making it the largest economic center in the country. Companies in Bucharest have an average ROMC score of 75/100, above the national average of 68/100.

[Continue with sections...]
```

---

**This prompt is LOCKED. All county page content generation must follow these rules.**

