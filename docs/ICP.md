# Ideal Customer Profile (ICP) Mapping & Funnel Design

**Last Updated:** 2024  
**Status:** Locked

---

## Overview

RoMarketCap serves four primary ICPs, each with distinct triggers, pains, hooks, and monetization paths. This document defines each ICP and their conversion funnels.

---

## ICP 1: Startup Founders

### Profile
- **Role:** Founder, CEO, or co-founder of a Romanian private company
- **Company Stage:** Seed to Series A, or established SME
- **Company Size:** 5-200 employees
- **Revenue:** €100K - €10M annually
- **Industry:** Tech, services, manufacturing, or high-growth sectors

### Trigger Moment
- Company appears on RoMarketCap (found via search or notification)
- Receives email about low ROMC score
- Competitor mentioned in rankings/newsletter
- Preparing for fundraising round
- Wanting to improve market position

### Primary Pain
- **"I don't know how I compare to competitors"**
- No visibility into market position
- Difficulty attracting investors without context
- No data-driven way to improve valuation
- Uncertainty about company's market standing

### Feature Hook
- **ROMC Score & Benchmarking**
  - See your company's ROMC score
  - Compare to competitors
  - Understand what affects your score
  - Track score improvements over time

### Monetization Path
1. **Free:** View own company page, basic ROMC score
2. **Premium:** Detailed forecasts, competitor analysis, score improvement insights
3. **Claim:** Claim company to update data and improve score
4. **Premium Upgrade:** Full access to forecasts, comparisons, exports

### Funnel Map

```
Landing → Search Company → View Company Page
                                    ↓
                            [ROMC Score Visible]
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
            [Low Score?]                    [High Score?]
                    ↓                               ↓
        "Improve Your Score" CTA          "See Full Report" CTA
                    ↓                               ↓
            Claim Company Form              Premium Paywall
                    ↓                               ↓
            Claim Submitted                 Checkout Flow
                    ↓                               ↓
            Email Drip (Day 0, 2, 5)        Premium Active
                    ↓                               ↓
            Claim Approved                  Dashboard Access
                    ↓                               ↓
            Update Company Data             Forecasts, Comparisons
                    ↓                               ↓
            Score Improvement               Export, API Access
                    ↓                               ↓
            Premium Upsell                  Retention
```

### Conversion Goals
- **Newsletter:** 15% of company page views
- **Claim:** 5% of company page views (for own company)
- **Premium:** 2% of claimed companies → Premium
- **API:** 0.5% of Premium users → API access

---

## ICP 2: Angel Investors / Syndicates

### Profile
- **Role:** Angel investor, syndicate lead, or early-stage investor
- **Investment Focus:** Romanian startups, tech companies, high-growth sectors
- **Deal Flow:** 5-50 investments per year
- **Check Size:** €10K - €500K per deal
- **Experience:** 2+ years investing in Romania

### Trigger Moment
- Looking for new investment opportunities
- Need to monitor portfolio companies
- Preparing for due diligence
- Wanting to track market trends
- Receiving weekly dealflow newsletter

### Primary Pain
- **"I can't find quality dealflow efficiently"**
- Manual company discovery is time-consuming
- No systematic way to identify high-potential companies
- Difficulty tracking portfolio company performance
- Missing market context for investment decisions

### Feature Hook
- **Dealflow Discovery & Portfolio Monitoring**
  - Watchlist with custom alerts
  - Advanced filters (ROMC score, growth, industry)
  - Weekly dealflow newsletter
  - Portfolio company tracking

### Monetization Path
1. **Free:** Basic company search, limited filters
2. **Newsletter:** Weekly dealflow digest
3. **Premium:** Advanced filters, watchlists, alerts, exports
4. **API:** Programmatic access for CRM integration

### Funnel Map

```
Landing → /investors Page → Value Prop
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
        "Create Watchlist" CTA          "Get Weekly Dealflow" CTA
                    ↓                               ↓
            Requires Login                 Newsletter Signup
                    ↓                               ↓
            Dashboard Access              Email Confirmation
                    ↓                               ↓
            Basic Filters                 Weekly Digest
                    ↓                               ↓
            [Hits Premium Gate]           Premium Upsell
                    ↓                               ↓
            Premium Paywall               Premium Upgrade
                    ↓                               ↓
            Checkout Flow                 Checkout Flow
                    ↓                               ↓
            Premium Active                Premium Active
                    ↓                               ↓
            Advanced Filters              Advanced Filters
                    ↓                               ↓
            Watchlist + Alerts            Watchlist + Alerts
                    ↓                               ↓
            Export CSV/JSON               Export CSV/JSON
                    ↓                               ↓
            API Access (upsell)           API Access (upsell)
                    ↓                               ↓
            Retention                     Retention
```

### Conversion Goals
- **Newsletter:** 25% of /investors page views
- **Premium:** 8% of newsletter subscribers → Premium
- **API:** 15% of Premium users → API access
- **Lead Form:** 2% of Premium users → Partnership inquiry

---

## ICP 3: Journalists / Analysts

### Profile
- **Role:** Business journalist, market analyst, or researcher
- **Outlet:** Tech blogs, business publications, research firms
- **Beat:** Romanian tech, startups, market analysis
- **Output:** Articles, reports, market analysis
- **Frequency:** Weekly to monthly content

### Trigger Moment
- Need data for article/report
- Tracking market trends
- Looking for company examples
- Preparing quarterly market report
- Need citation-worthy data

### Primary Pain
- **"I need reliable data for my articles/reports"**
- No comprehensive data source for Romanian private companies
- Difficulty finding company examples
- Need citation-worthy data
- Time-consuming manual research

### Feature Hook
- **Data Access & Citations**
  - Complete company database
  - Export CSV/JSON for analysis
  - "Cite this data" blocks
  - Market trend data

### Monetization Path
1. **Free:** Basic company search, public data
2. **Newsletter:** Weekly market digest
3. **Premium:** Full data access, exports, API
4. **Lead Form:** Media partnership inquiry

### Funnel Map

```
Landing → Search Company → View Company Page
                                    ↓
                            [Data Visible]
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
        "Cite This Data" Block          "Export Data" CTA
                    ↓                               ↓
            Copy Citation Link          [Hits Premium Gate]
                    ↓                               ↓
            Use in Article             Premium Paywall
                    ↓                               ↓
            Return for More Data       Checkout Flow
                    ↓                               ↓
            Newsletter Signup          Premium Active
                    ↓                               ↓
            Weekly Digest              Full Data Access
                    ↓                               ↓
            Premium Upsell             CSV/JSON Export
                    ↓                               ↓
            Premium Upgrade            API Access
                    ↓                               ↓
            Retention                  Retention
```

### Conversion Goals
- **Newsletter:** 20% of company page views (from journalists)
- **Premium:** 5% of newsletter subscribers → Premium
- **API:** 10% of Premium users → API access
- **Lead Form:** 3% of Premium users → Media partnership

---

## ICP 4: Corporate BD / M&A Scouts

### Profile
- **Role:** Business development, M&A analyst, or corporate strategist
- **Company Type:** Large corporations, PE firms, or consulting firms
- **Focus:** Partnerships, acquisitions, market intelligence
- **Budget:** €10K+ annually for data tools
- **Team Size:** 2-10 people

### Trigger Moment
- Scouting acquisition targets
- Looking for partnership opportunities
- Need market intelligence for strategy
- Competitive analysis required
- Due diligence preparation

### Primary Pain
- **"I need comprehensive market intelligence"**
- Manual research is inefficient
- No systematic way to identify targets
- Missing market context
- Need programmatic access for CRM integration

### Feature Hook
- **Market Intelligence & API Access**
  - Advanced search and filters
  - Export capabilities
  - API for CRM integration
  - Custom reports

### Monetization Path
1. **Free:** Basic search, limited data
2. **Premium:** Full data access, exports
3. **API:** Programmatic access (required)
4. **Lead Form:** Enterprise partnership inquiry

### Funnel Map

```
Landing → Search Companies → Advanced Filters
                                    ↓
                            [Hits Premium Gate]
                                    ↓
                            Premium Paywall
                                    ↓
                            Checkout Flow
                                    ↓
                            Premium Active
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
            Advanced Filters              Export CSV/JSON
                    ↓                               ↓
            Find Targets                 Analyze Data
                    ↓                               ↓
            [Need API Access]            [Need API Access]
                    ↓                               ↓
            API Upsell                  API Upsell
                    ↓                               ↓
            API Checkout                API Checkout
                    ↓                               ↓
            API Active                  API Active
                    ↓                               ↓
            CRM Integration             CRM Integration
                    ↓                               ↓
            Enterprise Upsell           Enterprise Upsell
                    ↓                               ↓
            Lead Form                   Lead Form
                    ↓                               ↓
            Partnership Inquiry         Partnership Inquiry
                    ↓                               ↓
            Retention                   Retention
```

### Conversion Goals
- **Premium:** 10% of advanced filter usage → Premium
- **API:** 30% of Premium users → API access
- **Lead Form:** 20% of API users → Enterprise partnership
- **Enterprise:** 5% of lead forms → Enterprise deal

---

## Cross-ICP Funnel Elements

### Newsletter Funnel (All ICPs)
```
Any Page → Newsletter CTA → Email Input
                                    ↓
                            Consent Checkbox
                                    ↓
                            Submit
                                    ↓
                            Email Confirmation
                                    ↓
                            Weekly Digest
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
            Premium Upsell              Retention
```

### Premium Funnel (All ICPs)
```
Premium Gate → Paywall → Checkout
                            ↓
                    Stripe Checkout
                            ↓
                    Webhook Processing
                            ↓
                    Premium Active
                            ↓
                    Dashboard Access
                            ↓
                    Feature Usage
                            ↓
                    Retention
```

### API Funnel (Premium Users)
```
Premium Dashboard → API Docs → API Key Request
                                    ↓
                            API Key Generated
                                    ↓
                            Integration Guide
                                    ↓
                            API Usage
                                    ↓
                            Usage Analytics
                                    ↓
                            Enterprise Upsell
```

### Lead Form Funnel (All ICPs)
```
Partnership CTA → Lead Form → Submit
                                    ↓
                            Admin Notification
                                    ↓
                            Admin Review
                                    ↓
                            Follow-up Email
                                    ↓
                            Partnership Discussion
```

---

## Conversion Benchmarks

### Newsletter Conversion
- **Target:** 15-25% of page views (varies by ICP)
- **Founders:** 15%
- **Investors:** 25%
- **Journalists:** 20%
- **Corporate BD:** 10%

### Premium Conversion
- **Target:** 2-10% of newsletter subscribers (varies by ICP)
- **Founders:** 2% (via claim → premium)
- **Investors:** 8%
- **Journalists:** 5%
- **Corporate BD:** 10%

### API Conversion
- **Target:** 10-30% of Premium users (varies by ICP)
- **Founders:** 0.5%
- **Investors:** 15%
- **Journalists:** 10%
- **Corporate BD:** 30%

### Lead Form Conversion
- **Target:** 2-20% of Premium/API users (varies by ICP)
- **Founders:** 2%
- **Investors:** 2%
- **Journalists:** 3%
- **Corporate BD:** 20%

---

## Funnel Optimization Priorities

### Phase 1: Newsletter Growth
- Optimize newsletter CTAs across all pages
- A/B test incentives and messaging
- Improve confirmation flow
- Track open/click rates

### Phase 2: Premium Conversion
- Optimize paywall messaging
- Improve checkout flow
- Add social proof
- Track conversion by ICP

### Phase 3: API Upsell
- Improve API documentation
- Add integration guides
- Track API usage
- Enterprise outreach

### Phase 4: Lead Generation
- Optimize lead forms
- Improve follow-up process
- Track partnership conversions
- Refine messaging by ICP

---

## ICP-Specific Messaging

### Founders
- **Hook:** "See how investors see you"
- **Pain:** "I don't know my market position"
- **Solution:** "ROMC score and benchmarking"
- **CTA:** "Improve your score" / "Claim your company"

### Investors
- **Hook:** "Automated dealflow for Romanian startups"
- **Pain:** "I can't find quality dealflow efficiently"
- **Solution:** "Watchlists, alerts, and weekly digest"
- **CTA:** "Create watchlist" / "Get weekly dealflow"

### Journalists
- **Hook:** "Citation-worthy data for your articles"
- **Pain:** "I need reliable data for my reports"
- **Solution:** "Complete database with export capabilities"
- **CTA:** "Cite this data" / "Export data"

### Corporate BD
- **Hook:** "Market intelligence for M&A and partnerships"
- **Pain:** "I need comprehensive market intelligence"
- **Solution:** "Advanced filters, exports, and API access"
- **CTA:** "View pricing" / "Request API access"

---

**This ICP mapping is LOCKED. All product features, marketing campaigns, and conversion funnels must align with these four ICPs.**

