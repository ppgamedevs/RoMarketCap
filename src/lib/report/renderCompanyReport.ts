import { getSiteUrl } from "@/lib/seo/site";
import { formatMoney } from "@/src/lib/money";

type ForecastRow = {
  horizonDays: number;
  forecastScore: number;
  forecastConfidence: number;
  forecastBandLow: number;
  forecastBandHigh: number;
  reasoning: unknown | null;
  computedAt: Date;
};

export function renderCompanyReportHtml(input: {
  lang: "ro" | "en";
  company: {
    slug: string;
    name: string;
    cui: string | null;
    county: string | null;
    city: string | null;
    website: string | null;
    romcScore: number | null;
    romcConfidence: number | null;
    romcAiScore: number | null;
    valuationRangeLow: number | null;
    valuationRangeHigh: number | null;
    valuationCurrency: string | null;
    lastScoredAt: Date | null;
    lastEnrichedAt: Date | null;
  };
  forecasts: ForecastRow[];
  showReasoning: boolean;
}) {
  const { lang, company, forecasts, showReasoning } = input;
  const base = getSiteUrl();
  const title = `${company.name} - Report - RoMarketCap`;
  const subtitle =
    lang === "ro"
      ? "Estimări informative. Nu este consultanță financiară."
      : "Informational estimates. Not financial advice.";

  const money = (v: number | null, cur: string | null) => {
    if (v == null) return "N/A";
    return formatMoney(v, cur ?? "EUR", lang === "ro" ? "ro-RO" : "en-US");
  };

  const score = (v: number | null) => (v == null ? "N/A" : `${Math.round(v)}/100`);

  const reportUrl = `${base}/company/${encodeURIComponent(company.slug)}/report`;

  const forecastRows = forecasts
    .map((f) => {
      const band = `${Math.round(f.forecastBandLow)}-${Math.round(f.forecastBandHigh)}`;
      const reasoningBlock =
        showReasoning && f.reasoning
          ? `<pre class="box pre">${escapeHtml(JSON.stringify(f.reasoning, null, 2)).slice(0, 4000)}</pre>`
          : "";
      return `
        <div class="box">
          <div class="row">
            <div><strong>${f.horizonDays}d</strong></div>
            <div>Score: ${score(f.forecastScore)}</div>
            <div>Band: ${band}</div>
            <div>Confidence: ${score(f.forecastConfidence)}</div>
          </div>
          ${reasoningBlock}
        </div>
      `;
    })
    .join("");

  return `<!doctype html>
<html lang="${lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <meta name="robots" content="noindex,nofollow" />
  <link rel="canonical" href="${escapeHtml(reportUrl)}" />
  <style>
    @page { size: A4; margin: 14mm; }
    body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color: #0f172a; }
    h1 { font-size: 20px; margin: 0; }
    h2 { font-size: 14px; margin: 18px 0 8px; }
    .muted { color: #475569; font-size: 12px; line-height: 1.4; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .box { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px; }
    .row { display: flex; gap: 12px; flex-wrap: wrap; font-size: 12px; }
    .pre { background: #f1f5f9; overflow: auto; font-size: 11px; }
    a { color: #0f172a; }
    .footer { margin-top: 18px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
    @media print {
      .no-print { display: none; }
      a { text-decoration: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 10px;">
    <button onclick="window.print()" style="border:1px solid #e2e8f0;background:#fff;border-radius:8px;padding:8px 10px;cursor:pointer;">
      ${lang === "ro" ? "Print / Save as PDF" : "Print / Save as PDF"}
    </button>
  </div>

  <h1>${escapeHtml(company.name)}</h1>
  <div class="muted">${escapeHtml(subtitle)}</div>
  <div class="muted">${company.cui ? `CUI: ${escapeHtml(company.cui)}` : ""} ${company.city || company.county ? `· ${escapeHtml([company.city, company.county].filter(Boolean).join(", "))}` : ""}</div>
  <div class="muted">${company.website ? `Website: ${escapeHtml(company.website)}` : ""}</div>

  <h2>${lang === "ro" ? "Summary" : "Summary"}</h2>
  <div class="grid">
    <div class="box"><div class="muted">ROMC v1</div><div><strong>${score(company.romcScore)}</strong></div></div>
    <div class="box"><div class="muted">ROMC AI</div><div><strong>${score(company.romcAiScore)}</strong></div></div>
    <div class="box"><div class="muted">${lang === "ro" ? "Confidence" : "Confidence"}</div><div><strong>${score(company.romcConfidence)}</strong></div></div>
  </div>
  <div class="grid" style="margin-top:10px;">
    <div class="box"><div class="muted">${lang === "ro" ? "Valuation range" : "Valuation range"}</div><div><strong>${money(company.valuationRangeLow, company.valuationCurrency)} - ${money(company.valuationRangeHigh, company.valuationCurrency)}</strong></div></div>
    <div class="box"><div class="muted">${lang === "ro" ? "Last scored" : "Last scored"}</div><div><strong>${company.lastScoredAt ? company.lastScoredAt.toISOString().slice(0,10) : "N/A"}</strong></div></div>
    <div class="box"><div class="muted">${lang === "ro" ? "Last enriched" : "Last enriched"}</div><div><strong>${company.lastEnrichedAt ? company.lastEnrichedAt.toISOString().slice(0,10) : "N/A"}</strong></div></div>
  </div>

  <h2>${lang === "ro" ? "Forecasts" : "Forecasts"}</h2>
  ${forecastRows || `<div class="muted">N/A</div>`}

  <div class="footer muted">
    ${lang === "ro"
      ? "RoMarketCap oferă estimări informative. Nu este consultanță financiară."
      : "RoMarketCap provides informational estimates. Not financial advice."}
  </div>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
}


