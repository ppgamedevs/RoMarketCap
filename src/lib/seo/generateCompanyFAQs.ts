/**
 * Generate industry-specific FAQs for company pages
 * 
 * Creates 5-8 FAQs per company based on:
 * - Company industry
 * - Company metrics (revenue, employees, market cap)
 * - Score trends
 */

import type { Company } from "@prisma/client";

export type FAQItem = {
  question: string;
  answer: string;
};

/**
 * Generate FAQs for a company
 */
export function generateCompanyFAQs(company: Company, lang: "ro" | "en" = "ro"): FAQItem[] {
  const faqs: FAQItem[] = [];

  const score = company.romcScore ?? 0;
  const industry = company.industry || "industria sa";
  const revenue = company.revenueLatest ? Number(company.revenueLatest) : null;
  const employees = company.employees ?? null;
  const marketCap = company.marketCap ? Number(company.marketCap) : null;

  // Core FAQ about ROMC Score
  if (lang === "ro") {
    faqs.push({
      question: `Cum se calculează ROMC Score pentru ${company.name}?`,
      answer: `ROMC Score pentru ${company.name} este ${score}/100 și este calculat pe baza mai multor factori, inclusiv venituri, număr de angajați, capitalizare de piață și alți indicatori financiari. Scorul este o estimare și doar informațional.`,
    });

    faqs.push({
      question: `Care este poziția ${company.name} în ${industry}?`,
      answer: `${company.name} este o companie din ${industry}${score >= 70 ? " cu un scor ROMC ridicat, indicând o poziție puternică pe piață" : score >= 50 ? " cu un scor ROMC moderat" : ""}. ${revenue ? `Veniturile raportate sunt de ${new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(revenue)}.` : ""} Datele sunt estimate și doar informaționale.`,
    });
  } else {
    faqs.push({
      question: `How is ROMC Score calculated for ${company.name}?`,
      answer: `ROMC Score for ${company.name} is ${score}/100 and is calculated based on multiple factors, including revenue, number of employees, market capitalization, and other financial indicators. The score is an estimate and informational only.`,
    });

    faqs.push({
      question: `What is ${company.name}'s position in ${industry}?`,
      answer: `${company.name} is a company in ${industry}${score >= 70 ? " with a high ROMC score, indicating a strong market position" : score >= 50 ? " with a moderate ROMC score" : ""}. ${revenue ? `Reported revenue is ${new Intl.NumberFormat("en-US", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(revenue)}.` : ""} Data is estimated and informational only.`,
    });
  }

  // Market cap FAQ
  if (marketCap) {
    if (lang === "ro") {
      faqs.push({
        question: `Cât valorează ${company.name}?`,
        answer: `Capitalizarea de piață estimată pentru ${company.name} este de ${new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(marketCap)}. ${company.isListed ? "Compania este listată la Bursa de Valori București." : ""} Această valoare este o estimare și doar informațională.`,
      });
    } else {
      faqs.push({
        question: `What is ${company.name} worth?`,
        answer: `The estimated market capitalization for ${company.name} is ${new Intl.NumberFormat("en-US", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(marketCap)}. ${company.isListed ? "The company is listed on the Bucharest Stock Exchange." : ""} This value is an estimate and informational only.`,
      });
    }
  }

  // Revenue FAQ
  if (revenue) {
    if (lang === "ro") {
      faqs.push({
        question: `Care sunt veniturile ${company.name}?`,
        answer: `${company.name} raportează venituri de ${new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(revenue)}. ${employees ? `Compania are ${employees} angajați.` : ""} Aceste date sunt estimate și doar informaționale.`,
      });
    } else {
      faqs.push({
        question: `What are ${company.name}'s revenues?`,
        answer: `${company.name} reports revenue of ${new Intl.NumberFormat("en-US", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(revenue)}. ${employees ? `The company has ${employees} employees.` : ""} This data is estimated and informational only.`,
      });
    }
  }

  // Comparison FAQ
  if (lang === "ro") {
    faqs.push({
      question: `Cum se compară ${company.name} cu competitorii?`,
      answer: `${company.name} are un scor ROMC de ${score}/100${marketCap ? ` și o capitalizare de piață de ${new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(marketCap)}` : ""}. Pentru o comparație detaliată, consultați pagina de comparație cu alte companii din ${industry}. Datele sunt estimate și doar informaționale.`,
    });
  } else {
    faqs.push({
      question: `How does ${company.name} compare to competitors?`,
      answer: `${company.name} has a ROMC score of ${score}/100${marketCap ? ` and a market capitalization of ${new Intl.NumberFormat("en-US", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(marketCap)}` : ""}. For a detailed comparison, see the comparison page with other companies in ${industry}. Data is estimated and informational only.`,
    });
  }

  // Evaluation factors FAQ
  if (lang === "ro") {
    faqs.push({
      question: `Ce factori influențează evaluarea ${company.name}?`,
      answer: `Evaluarea ${company.name} este influențată de mai mulți factori: ${revenue ? "venituri, " : ""}${employees ? "număr de angajați, " : ""}${marketCap ? "capitalizare de piață, " : ""}scor ROMC (${score}/100), și alți indicatori financiari. ${company.dataConfidence ? `Încrederea în date este de ${company.dataConfidence}%.` : ""} Toate acestea sunt estimate și doar informaționale.`,
    });
  } else {
    faqs.push({
      question: `What factors influence ${company.name}'s valuation?`,
      answer: `${company.name}'s valuation is influenced by multiple factors: ${revenue ? "revenue, " : ""}${employees ? "number of employees, " : ""}${marketCap ? "market capitalization, " : ""}ROMC score (${score}/100), and other financial indicators. ${company.dataConfidence ? `Data confidence is ${company.dataConfidence}%.` : ""} All of these are estimates and informational only.`,
    });
  }

  // Industry-specific FAQ
  if (lang === "ro") {
    faqs.push({
      question: `Care sunt tendințele din ${industry} pentru ${company.name}?`,
      answer: `${company.name} activează în ${industry}, un sector ${score >= 70 ? "competitiv" : "dinamic"} al economiei românești. ${revenue ? `Cu venituri de ${new Intl.NumberFormat("ro-RO", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(revenue)}, ` : ""}compania se situează ${score >= 70 ? "printre liderii" : score >= 50 ? "în mijlocul" : "în partea de jos a"} industriei. Datele sunt estimate și doar informaționale.`,
    });
  } else {
    faqs.push({
      question: `What are the trends in ${industry} for ${company.name}?`,
      answer: `${company.name} operates in ${industry}, a ${score >= 70 ? "competitive" : "dynamic"} sector of the Romanian economy. ${revenue ? `With revenue of ${new Intl.NumberFormat("en-US", { style: "currency", currency: "RON", maximumFractionDigits: 0 }).format(revenue)}, ` : ""}the company is positioned ${score >= 70 ? "among the leaders" : score >= 50 ? "in the middle" : "at the bottom"} of the industry. Data is estimated and informational only.`,
    });
  }

  // Data freshness FAQ
  if (company.lastScoredAt) {
    const lastScored = new Date(company.lastScoredAt);
    const daysAgo = Math.floor((Date.now() - lastScored.getTime()) / (1000 * 60 * 60 * 24));
    
    if (lang === "ro") {
      faqs.push({
        question: `Cât de recente sunt datele pentru ${company.name}?`,
        answer: `Scorul ROMC pentru ${company.name} a fost calculat ultima dată ${daysAgo === 0 ? "astăzi" : daysAgo === 1 ? "ieri" : `acum ${daysAgo} zile`}. ${company.lastEnrichedAt ? `Datele au fost actualizate recent.` : ""} Pentru cele mai recente informații, consultați sursele oficiale.`,
      });
    } else {
      faqs.push({
        question: `How recent is the data for ${company.name}?`,
        answer: `The ROMC score for ${company.name} was last calculated ${daysAgo === 0 ? "today" : daysAgo === 1 ? "yesterday" : `${daysAgo} days ago`}. ${company.lastEnrichedAt ? "Data has been recently updated." : ""} For the most recent information, consult official sources.`,
      });
    }
  }

  return faqs.slice(0, 8); // Limit to 8 FAQs
}

/**
 * Generate FAQPage schema JSON-LD
 */
export function generateFAQSchema(faqs: FAQItem[], companyName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
