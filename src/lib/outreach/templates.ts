import type { Lang } from "@/src/lib/i18n/shared";
import { getSiteUrl } from "@/lib/seo/site";

export function founderClaimEmail(lang: Lang, companyName: string, companySlug: string, romcScore: number | null) {
  const baseUrl = getSiteUrl();
  const companyUrl = `${baseUrl}/company/${encodeURIComponent(companySlug)}`;
  const claimUrl = `${companyUrl}?claim=true`;

  const subject =
    lang === "ro"
      ? `Revendică ${companyName} pe RoMarketCap`
      : `Claim ${companyName} on RoMarketCap`;

  const text =
    lang === "ro"
      ? `Bună ziua,

Am observat că ${companyName} apare în baza noastră de date cu un scor ROMC de ${romcScore ?? "N/A"}/100.

Ca fondator sau reprezentant al companiei, poți revendica compania pentru a:
- Actualiza datele și îmbunătăți scorul ROMC
- Accesa funcții premium (forecast-uri, analize detaliate)
- Controla vizibilitatea companiei

Revendică acum: ${claimUrl}
Vezi compania: ${companyUrl}

Întrebări? Răspunde la acest email.

RoMarketCap`
      : `Hello,

We noticed that ${companyName} appears in our database with a ROMC score of ${romcScore ?? "N/A"}/100.

As a founder or representative of the company, you can claim the company to:
- Update data and improve the ROMC score
- Access premium features (forecasts, detailed analysis)
- Control company visibility

Claim now: ${claimUrl}
View company: ${companyUrl}

Questions? Reply to this email.

RoMarketCap`;

  return { subject, text };
}

export function investorIntroEmail(lang: Lang, investorName?: string) {
  const baseUrl = getSiteUrl();
  const investorsUrl = `${baseUrl}/investors`;
  const newsletterUrl = `${baseUrl}/newsletter`;

  const subject =
    lang === "ro"
      ? `Dealflow românesc pentru investitori`
      : `Romanian dealflow for investors`;

  const text =
    lang === "ro"
      ? `Bună ziua${investorName ? ` ${investorName}` : ""},

RoMarketCap oferă dealflow automat pentru investitori și fonduri din România.

Ce oferim:
- Scoruri ROMC actualizate zilnic pentru toate companiile private
- Forecast-uri 90/180 zile pentru evaluare rapidă
- Watchlist-uri personalizate și alertări
- Export CSV/JSON și API access pentru integrare

Pentru investitori:
${investorsUrl}

Abonează-te la newsletter pentru dealflow săptămânal:
${newsletterUrl}

Întrebări? Răspunde la acest email.

RoMarketCap`
      : `Hello${investorName ? ` ${investorName}` : ""},

RoMarketCap provides automated dealflow for investors and funds in Romania.

What we offer:
- Daily updated ROMC scores for all private companies
- 90/180 day forecasts for rapid evaluation
- Customized watchlists and alerts
- CSV/JSON exports and API access for integration

For investors:
${investorsUrl}

Subscribe to newsletter for weekly dealflow:
${newsletterUrl}

Questions? Reply to this email.

RoMarketCap`;

  return { subject, text };
}

export function partnershipPitchEmail(lang: Lang, partnerName?: string) {
  const baseUrl = getSiteUrl();
  const partnersUrl = `${baseUrl}/partners`;

  const subject =
    lang === "ro"
      ? `Parteneriat cu RoMarketCap`
      : `Partnership with RoMarketCap`;

  const text =
    lang === "ro"
      ? `Bună ziua${partnerName ? ` ${partnerName}` : ""},

RoMarketCap este platforma de referință pentru date despre companiile private din România.

Căutăm parteneri pentru:
- Integrări API pentru date despre companii
- Parteneriate de distribuție
- Colaborări strategice

Află mai multe:
${partnersUrl}

Întrebări? Răspunde la acest email.

RoMarketCap`
      : `Hello${partnerName ? ` ${partnerName}` : ""},

RoMarketCap is the reference platform for data on private companies in Romania.

We're looking for partners for:
- API integrations for company data
- Distribution partnerships
- Strategic collaborations

Learn more:
${partnersUrl}

Questions? Reply to this email.

RoMarketCap`;

  return { subject, text };
}

