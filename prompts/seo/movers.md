# Market Movers Page SEO Generation Prompt

**Content Type:** Market Movers Commentary  
**URL Pattern:** `/movers` (main), `/movers/[period]` (archived)  
**Purpose:** Provide analysis of companies with significant ROMC score changes

---

## Tone Guidelines

### Voice
- **Analytical and insightful** - Market intelligence commentary
- **Data-driven** - Let numbers tell the story
- **Trend-focused** - Explain what's happening and why
- **Educational** - Help readers understand market movements

### Writing Style
- Use third person ("Companies", "The market", "These movers")
- Present tense for current state, past tense for trends
- Short paragraphs (3-4 sentences max)
- Bullet points for lists
- Clear trend explanations

---

## Forbidden Phrases

### Never Use:
- ❌ "Market crash" or "market boom" (too dramatic)
- ❌ "Investors should" or "Buy now" (financial advice)
- ❌ "Guaranteed growth" (no guarantees)
- ❌ "Revolutionary change" (overused)
- ❌ "Unprecedented" (unless truly unprecedented)
- ❌ "Market manipulation" (accusatory)
- ❌ "Insider information" (implies illegal activity)
- ❌ "Hot stocks" or "trending companies" (stock market language)
- ❌ Investment recommendations
- ❌ Speculative claims without data

### Instead Use:
- ✅ "ROMC score increased by [X] points"
- ✅ "[X] companies saw significant score changes"
- ✅ "The largest increases were in [industry]"
- ✅ Data-backed statements only

---

## Data Grounding Rules

### Required Data Points
1. **Time Period** - Last 30 days (or specified period)
2. **Top Increases** - Top 10 companies with biggest ROMC gains
3. **Top Decreases** - Top 10 companies with biggest ROMC losses
4. **Industry Analysis** - Which industries moved most
5. **County Analysis** - Which counties moved most
6. **Score Changes** - Exact point changes for each company
7. **Historical Context** - Compare to previous periods

### Data Usage Rules
1. **Always show time period** - "In the last 30 days" or "Week of [date]"
2. **Show exact changes** - "ROMC score increased from [X] to [Y]" not "increased significantly"
3. **Provide context** - "Above average" or "Below average" movement
4. **Cite sample size** - "Based on [X] companies with score changes"
5. **Qualify movements** - "Significant change" defined as >5 points
6. **Show confidence** - "High confidence" vs "Estimated" movements

### Data Hierarchy
1. **Score history data** - Actual ROMC score changes
2. **Aggregated trends** - Industry/county level movements
3. **Comparative data** - Current period vs previous periods
4. **Forecast data** - Projected trends (clearly marked)

---

## Content Structure

### 1. Hero Section (50-100 words)
- Time period covered
- Total companies analyzed
- Key finding (e.g., "X companies saw significant movements")
- One-sentence market summary

### 2. Top Increases Section (150-200 words)
- List top 10 companies with biggest ROMC gains
- Include exact score changes (from X to Y)
- Link to company pages
- Brief explanation of why they moved up
- Industry/county context

### 3. Top Decreases Section (150-200 words)
- List top 10 companies with biggest ROMC losses
- Include exact score changes (from X to Y)
- Link to company pages
- Brief explanation of why they moved down
- Industry/county context

### 4. Industry Analysis Section (100-150 words)
- Which industries saw most movement
- Average score changes by industry
- Industry-specific trends
- Link to industry pages

### 5. County Analysis Section (100-150 words)
- Which counties saw most movement
- Average score changes by county
- County-specific trends
- Link to county pages

### 6. Market Commentary Section (100-200 words)
- Overall market trends
- What these movements indicate
- Context and insights
- Methodology note

### 7. Archive Links Section (50 words)
- Links to previous periods
- "View all movers" link
- Historical comparison links

**Total Length:** 700-1,050 words (minimum 500 words for SEO)

---

## CTA Insertion Logic

### Primary CTA (Above the fold)
- **"Get weekly movers digest"** - Newsletter signup
- **"Track movers in your industry"** - Premium gate

### Secondary CTAs (Within content)
- **After top increases:** "Monitor these companies" (watchlist CTA)
- **After top decreases:** "Get alerts on score changes" (premium gate)
- **After industry analysis:** "See [industry] movers" (link to filtered view)

### Tertiary CTAs (Bottom of page)
- **Newsletter CTA:** "Get weekly market movers digest"
- **Premium CTA:** "Upgrade for movers alerts"
- **API CTA:** "Need movers data via API?" (for B2B users)

### CTA Rules
1. **Maximum 3 CTAs per page** (1 primary, 2 secondary)
2. **Movement-specific** - CTAs should reference tracking/monitoring
3. **Clear value prop** - Explain benefit for tracking movers
4. **No pressure** - Soft language, helpful tone

---

## SEO Optimization Rules

### Title Tag
- Format: `Market Movers - Top ROMC Score Changes | RoMarketCap`
- Max 60 characters
- Include time period if space allows
- Focus on "movers" keyword

### Meta Description
- Format: `Top companies with biggest ROMC score changes in Romania. See which companies gained or lost the most in market position. Updated weekly on RoMarketCap.`
- Max 160 characters
- Include "movers" keyword
- Include time period
- Include call to action

### H1 Tag
- Format: `Market Movers`
- Simple and clear
- Can include time period: "Market Movers (Last 30 Days)"

### H2 Tags
- "Top Increases"
- "Top Decreases"
- "Industry Analysis"
- "County Analysis"
- "Market Commentary"
- "Archive"

### Internal Links
- Minimum 5 internal links
- Maximum 15 internal links
- Link to:
  - Company pages (for movers)
  - Industry pages (for industry analysis)
  - County pages (for county analysis)
  - Previous movers pages (archive)
  - Digest pages (related content)
  - Methodology page
  - About page

### External Links
- Official sources (if relevant)
- Maximum 2 external links
- All external links: `rel="nofollow"`

---

## Structured Data Requirements

### ItemList Schema
```json
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "name": "Market Movers - Top ROMC Score Changes",
  "numberOfItems": 20,
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "url": "[Company URL]",
      "name": "[Company Name]",
      "additionalProperty": {
        "@type": "PropertyValue",
        "name": "ROMC Score Change",
        "value": "+15"
      }
    }
  ]
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
      "name": "Market Movers",
      "item": "https://romarketcap.ro/movers"
    }
  ]
}
```

---

## Quality Checklist

Before generating content, verify:
- ✅ Time period is clearly stated
- ✅ Top increases/decreases lists are accurate
- ✅ Score changes are exact (from X to Y)
- ✅ Industry/county analysis is data-backed
- ✅ No forbidden phrases used
- ✅ All claims are data-backed
- ✅ Internal links are relevant
- ✅ Structured data is valid
- ✅ CTAs are movement-specific
- ✅ Content length meets minimum (500 words)
- ✅ Meta tags are optimized
- ✅ Canonical URL is set

---

## Example Output Structure

```markdown
# Market Movers (Last 30 Days)

**Period:** [Start Date] - [End Date]  
**Companies Analyzed:** [X]  
**Significant Movements:** [Y] companies with >5 point changes

## Top Increases

The following companies saw the largest ROMC score increases in the last 30 days:

1. **Company A** - ROMC score increased from 65 to 82 (+17 points)
   - Industry: Software
   - County: Bucharest
   - [Brief explanation]

[Continue with sections...]
```

---

**This prompt is LOCKED. All market movers page content generation must follow these rules.**

