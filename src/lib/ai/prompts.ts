/**
 * AI Prompt Templates
 * 
 * System prompts and context builders for ROMC AI assistant
 */

export function buildSystemPrompt(lang: "ro" | "en", page?: string): string {
  const basePrompt = lang === "ro"
    ? `Ești ROMC AI, asistentul inteligent al platformei RoMarketCap. Rolul tău este să ajuți utilizatorii să înțeleagă:
- Scorul ROMC și metodologia de calcul
- Datele despre companiile românești
- Metrici financiare (market cap, venituri, profit)
- Tendențe de piață și analize
- Comparații între companii

Răspunde întotdeauna în română, într-un ton profesional dar prietenos. Fii concis dar informativ.`
    : `You are ROMC AI, the intelligent assistant of the RoMarketCap platform. Your role is to help users understand:
- ROMC Score and calculation methodology
- Data about Romanian companies
- Financial metrics (market cap, revenue, profit)
- Market trends and analysis
- Company comparisons

Always respond in English, in a professional but friendly tone. Be concise but informative.`;

  if (page === "company") {
    return basePrompt + (lang === "ro"
      ? "\n\nUtilizatorul este pe o pagină de companie. Poți oferi informații specifice despre această companie."
      : "\n\nThe user is on a company page. You can provide specific information about this company.");
  }

  if (page === "industry") {
    return basePrompt + (lang === "ro"
      ? "\n\nUtilizatorul este pe o pagină de industrie. Poți oferi informații despre companiile din această industrie."
      : "\n\nThe user is on an industry page. You can provide information about companies in this industry.");
  }

  return basePrompt;
}

export function buildContextPrompt(contextData: any, lang: "ro" | "en"): string {
  const parts: string[] = [];

  if (contextData.company) {
    const c = contextData.company;
    parts.push(lang === "ro"
      ? `Companie curentă: ${c.name} (CUI: ${c.cui || "N/A"})
- Scor ROMC: ${c.romcScore ?? "N/A"}/100
- Venituri: ${c.revenueLatest ? new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(c.revenueLatest) : "N/A"}
- Angajați: ${c.employees ?? "N/A"}
- Industrie: ${c.industry ?? "N/A"}
- Județ: ${c.county ?? "N/A"}
- Market Cap: ${c.marketCap ? new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(c.marketCap) : "N/A"}
- Confidență date: ${c.dataConfidence ?? "N/A"}/100`
      : `Current company: ${c.name} (CUI: ${c.cui || "N/A"})
- ROMC Score: ${c.romcScore ?? "N/A"}/100
- Revenue: ${c.revenueLatest ? new Intl.NumberFormat("en-US", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(c.revenueLatest) : "N/A"}
- Employees: ${c.employees ?? "N/A"}
- Industry: ${c.industry ?? "N/A"}
- County: ${c.county ?? "N/A"}
- Market Cap: ${c.marketCap ? new Intl.NumberFormat("en-US", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(c.marketCap) : "N/A"}
- Data Confidence: ${c.dataConfidence ?? "N/A"}/100`);
  }

  if (contextData.industry) {
    const i = contextData.industry;
    parts.push(lang === "ro"
      ? `Industrie curentă: ${i.slug}
- Total companii: ${i.totalCompanies}
- Scor ROMC mediu: ${Math.round(i.avgScore || 0)}/100`
      : `Current industry: ${i.slug}
- Total companies: ${i.totalCompanies}
- Average ROMC Score: ${Math.round(i.avgScore || 0)}/100`);
  }

  return parts.join("\n\n");
}
