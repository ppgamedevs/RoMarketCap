export type Lang = "ro" | "en";
export const DEFAULT_LANG: Lang = "ro";

export const DICT = {
  ro: {
    brand: "RoMarketCap",
    nav_company: "Companii",
    nav_billing: "Abonament",
    nav_about: "Despre",
    nav_pricing: "Prețuri",
    hero_title: "Inteligență de piață pentru companii private din România",
    hero_subtitle: "Scor ROMC, semnale și estimări, într-un format clar și explicabil.",
    cta_explore: "Vezi companii",
    cta_upgrade: "Upgrade la Premium",
    disclaimer: "Estimări. Doar informativ. Nu este consultanță financiară.",
    company_summary: "Sumar",
    romc_score: "ROMC Score",
    confidence: "Încredere",
    valuation_range: "Interval evaluare (EUR)",
    last_scored: "Ultima calculare",
    how_romc_works: "Cum funcționează ROMC",
    how_romc_body:
      "ROMC v1 este un scor determinist. Folosește semnale simple (website, vechime, angajați, venituri, profit, completitudine). Încrederea crește când avem mai multe câmpuri și metrici. Multiplii și cursul sunt placeholder și vor fi rafinați.",
    premium_title: "Premium",
    premium_benefits_title: "Ce primești",
    premium_b1: "Insight-uri și breakdown complet",
    premium_b2: "Istoric extins și export",
    premium_b3: "Semnale timpurii și comparații",
    premium_locked: "Conținut Premium. Ai nevoie de abonament.",
    premium_active: "Ai acces Premium.",
    claim_btn: "Revendică această companie",
    submit_update: "Trimite o actualizare",
    submit_note: "Se va revizui înainte de publicare.",
    submit_success: "Mulțumim. Actualizarea a fost trimisă pentru revizuire.",
    login_required: "Necesită autentificare.",
    invite: "Invite",
    report: "Report",
    report_preview: "Preview (blurred)",
    request_correction: "Cere o corecție",
  },
  en: {
    brand: "RoMarketCap",
    nav_company: "Companies",
    nav_billing: "Billing",
    nav_about: "About",
    nav_pricing: "Pricing",
    hero_title: "Market intelligence for private Romanian companies",
    hero_subtitle: "ROMC score, signals, and estimates in a clear and explainable format.",
    cta_explore: "Explore companies",
    cta_upgrade: "Upgrade to Premium",
    disclaimer: "Estimates. Informational only. Not financial advice.",
    company_summary: "Summary",
    romc_score: "ROMC Score",
    confidence: "Confidence",
    valuation_range: "Valuation range (EUR)",
    last_scored: "Last computed",
    how_romc_works: "How ROMC works",
    how_romc_body:
      "ROMC v1 is a deterministic score. It uses simple signals (website, company age, employees, revenue, profit, completeness). Confidence increases with more fields and metrics. Multiples and FX are placeholders and will be refined.",
    premium_title: "Premium",
    premium_benefits_title: "What you get",
    premium_b1: "Insights and full breakdown",
    premium_b2: "Extended history and export",
    premium_b3: "Early signals and comparisons",
    premium_locked: "Premium content. You need a subscription.",
    premium_active: "You have Premium access.",
    claim_btn: "Claim this company",
    submit_update: "Submit update",
    submit_note: "It will be reviewed before publishing.",
    submit_success: "Thanks. Your update was submitted for review.",
    login_required: "Login required.",
    invite: "Invite",
    report: "Report",
    report_preview: "Preview (blurred)",
    request_correction: "Request correction",
  },
} as const;

export type I18nKey = keyof typeof DICT.ro;

export function t(lang: Lang, key: I18nKey): string {
  return DICT[lang][key];
}

export function normalizeLang(value: string | null | undefined): Lang {
  return value === "en" ? "en" : "ro";
}


