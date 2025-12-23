import type { Lang } from "@/src/lib/i18n";

export type FaqItem = {
  question: string;
  answer: string;
};

/**
 * FAQ templates for programmatic SEO pages
 */

export function getTopIndustryFaq(lang: Lang, industryLabel: string): FaqItem[] {
  if (lang === "ro") {
    return [
      {
        question: `Care sunt cele mai bune companii din industria ${industryLabel}?`,
        answer: `Lista de pe această pagină arată companiile din industria ${industryLabel} ordonate după scorul ROMC (Romanian Market Cap). Scorul ROMC este un indicator care combină mai mulți factori pentru a estima valoarea și potențialul unei companii private din România.`,
      },
      {
        question: `Cum se calculează scorul ROMC pentru companiile din ${industryLabel}?`,
        answer: `Scorul ROMC pentru companiile din ${industryLabel} se calculează pe baza mai multor factori: cifra de afaceri, profitabilitate, număr de angajați, creștere, și alți indicatori financiari. Scorul este actualizat periodic pentru a reflecta cele mai recente date disponibile.`,
      },
      {
        question: `Pot să văd detalii complete despre o companie din ${industryLabel}?`,
        answer: `Da, fiecare companie din listă are o pagină dedicată cu informații detaliate, inclusiv scor ROMC, estimări de valoare, și analize. Unele funcții avansate (precum forecast-uri și rapoarte detaliate) necesită un abonament Premium.`,
      },
      {
        question: `Cât de des se actualizează datele pentru companiile din ${industryLabel}?`,
        answer: `Datele pentru companiile din ${industryLabel} sunt actualizate periodic. Scorurile ROMC sunt recalculate zilnic, iar datele de înbogățire (enrichment) sunt actualizate la fiecare 6 ore pentru companiile prioritare.`,
      },
    ];
  }
  return [
    {
      question: `What are the best companies in the ${industryLabel} industry?`,
      answer: `This page lists companies in the ${industryLabel} industry ranked by ROMC score (Romanian Market Cap). The ROMC score is an indicator that combines multiple factors to estimate the value and potential of a private Romanian company.`,
    },
    {
      question: `How is the ROMC score calculated for ${industryLabel} companies?`,
      answer: `The ROMC score for ${industryLabel} companies is calculated based on multiple factors: revenue, profitability, number of employees, growth, and other financial indicators. The score is updated periodically to reflect the most recent available data.`,
    },
    {
      question: `Can I see complete details about a ${industryLabel} company?`,
      answer: `Yes, each company in the list has a dedicated page with detailed information, including ROMC score, valuation estimates, and analysis. Some advanced features (such as forecasts and detailed reports) require a Premium subscription.`,
    },
    {
      question: `How often is data updated for ${industryLabel} companies?`,
      answer: `Data for ${industryLabel} companies is updated periodically. ROMC scores are recalculated daily, and enrichment data is updated every 6 hours for priority companies.`,
    },
  ];
}

export function getTopCountyFaq(lang: Lang, countyLabel: string): FaqItem[] {
  if (lang === "ro") {
    return [
      {
        question: `Care sunt cele mai bune companii din județul ${countyLabel}?`,
        answer: `Lista de pe această pagină arată companiile din județul ${countyLabel} ordonate după scorul ROMC (Romanian Market Cap). Scorul ROMC este un indicator care combină mai mulți factori pentru a estima valoarea și potențialul unei companii private din România.`,
      },
      {
        question: `Cum se calculează scorul ROMC pentru companiile din ${countyLabel}?`,
        answer: `Scorul ROMC pentru companiile din ${countyLabel} se calculează pe baza mai multor factori: cifra de afaceri, profitabilitate, număr de angajați, creștere, și alți indicatori financiari. Scorul este actualizat periodic pentru a reflecta cele mai recente date disponibile.`,
      },
      {
        question: `Pot să văd detalii complete despre o companie din ${countyLabel}?`,
        answer: `Da, fiecare companie din listă are o pagină dedicată cu informații detaliate, inclusiv scor ROMC, estimări de valoare, și analize. Unele funcții avansate (precum forecast-uri și rapoarte detaliate) necesită un abonament Premium.`,
      },
      {
        question: `Cât de des se actualizează datele pentru companiile din ${countyLabel}?`,
        answer: `Datele pentru companiile din ${countyLabel} sunt actualizate periodic. Scorurile ROMC sunt recalculate zilnic, iar datele de înbogățire (enrichment) sunt actualizate la fiecare 6 ore pentru companiile prioritare.`,
      },
    ];
  }
  return [
    {
      question: `What are the best companies in ${countyLabel} county?`,
      answer: `This page lists companies in ${countyLabel} county ranked by ROMC score (Romanian Market Cap). The ROMC score is an indicator that combines multiple factors to estimate the value and potential of a private Romanian company.`,
    },
    {
      question: `How is the ROMC score calculated for ${countyLabel} companies?`,
      answer: `The ROMC score for ${countyLabel} companies is calculated based on multiple factors: revenue, profitability, number of employees, growth, and other financial indicators. The score is updated periodically to reflect the most recent available data.`,
    },
    {
      question: `Can I see complete details about a ${countyLabel} company?`,
      answer: `Yes, each company in the list has a dedicated page with detailed information, including ROMC score, valuation estimates, and analysis. Some advanced features (such as forecasts and detailed reports) require a Premium subscription.`,
    },
    {
      question: `How often is data updated for ${countyLabel} companies?`,
      answer: `Data for ${countyLabel} companies is updated periodically. ROMC scores are recalculated daily, and enrichment data is updated every 6 hours for priority companies.`,
    },
  ];
}

export function getNewIndustryFaq(lang: Lang, industryLabel: string): FaqItem[] {
  if (lang === "ro") {
    return [
      {
        question: `Care sunt companiile noi din industria ${industryLabel}?`,
        answer: `Această pagină arată companiile din industria ${industryLabel} care au fost adăugate sau actualizate recent în baza de date RoMarketCap. Acestea includ companii noi, dar și companii existente cu date actualizate.`,
      },
      {
        question: `Cum determină RoMarketCap că o companie este "nouă"?`,
        answer: `O companie este considerată "nouă" dacă a fost adăugată recent în baza de date sau dacă datele sale au fost actualizate semnificativ în ultimele săptămâni. Lista este ordonată după data ultimei actualizări.`,
      },
      {
        question: `Pot să văd detalii despre companiile noi din ${industryLabel}?`,
        answer: `Da, fiecare companie din listă are o pagină dedicată cu informații detaliate. Click pe numele companiei pentru a vedea scorul ROMC, estimări de valoare, și alte date relevante.`,
      },
    ];
  }
  return [
    {
      question: `What are the new companies in the ${industryLabel} industry?`,
      answer: `This page shows companies in the ${industryLabel} industry that have been recently added or updated in the RoMarketCap database. These include new companies, as well as existing companies with updated data.`,
    },
    {
      question: `How does RoMarketCap determine if a company is "new"?`,
      answer: `A company is considered "new" if it was recently added to the database or if its data was significantly updated in recent weeks. The list is ordered by the date of last update.`,
    },
    {
      question: `Can I see details about new ${industryLabel} companies?`,
      answer: `Yes, each company in the list has a dedicated page with detailed information. Click on the company name to see ROMC score, valuation estimates, and other relevant data.`,
    },
  ];
}

export function getNewCountyFaq(lang: Lang, countyLabel: string): FaqItem[] {
  if (lang === "ro") {
    return [
      {
        question: `Care sunt companiile noi din județul ${countyLabel}?`,
        answer: `Această pagină arată companiile din județul ${countyLabel} care au fost adăugate sau actualizate recent în baza de date RoMarketCap. Acestea includ companii noi, dar și companii existente cu date actualizate.`,
      },
      {
        question: `Cum determină RoMarketCap că o companie este "nouă"?`,
        answer: `O companie este considerată "nouă" dacă a fost adăugată recent în baza de date sau dacă datele sale au fost actualizate semnificativ în ultimele săptămâni. Lista este ordonată după data ultimei actualizări.`,
      },
      {
        question: `Pot să văd detalii despre companiile noi din ${countyLabel}?`,
        answer: `Da, fiecare companie din listă are o pagină dedicată cu informații detaliate. Click pe numele companiei pentru a vedea scorul ROMC, estimări de valoare, și alte date relevante.`,
      },
    ];
  }
  return [
    {
      question: `What are the new companies in ${countyLabel} county?`,
      answer: `This page shows companies in ${countyLabel} county that have been recently added or updated in the RoMarketCap database. These include new companies, as well as existing companies with updated data.`,
    },
    {
      question: `How does RoMarketCap determine if a company is "new"?`,
      answer: `A company is considered "new" if it was recently added to the database or if its data was significantly updated in recent weeks. The list is ordered by the date of last update.`,
    },
    {
      question: `Can I see details about new ${countyLabel} companies?`,
      answer: `Yes, each company in the list has a dedicated page with detailed information. Click on the company name to see ROMC score, valuation estimates, and other relevant data.`,
    },
  ];
}

