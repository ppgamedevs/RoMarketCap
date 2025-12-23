import type { Lang } from "@/src/lib/i18n/shared";
import { getSiteUrl } from "@/lib/seo/site";

export function claimDripEmailDay0(lang: Lang, companyName: string, companySlug: string) {
  const baseUrl = getSiteUrl();
  const companyUrl = `${baseUrl}/company/${encodeURIComponent(companySlug)}`;
  const claimUrl = `${companyUrl}?claim=true`;

  const subject = lang === "ro" ? `Revendicare trimisă: ${companyName}` : `Claim submitted: ${companyName}`;
  const text =
    lang === "ro"
      ? `Bună ziua,

Am primit cererea ta de revendicare pentru ${companyName}. Echipa noastră o va revizui în următoarele zile.

Ce urmează:
- Vei primi un email când cererea este aprobată sau respinsă
- După aprobare, vei putea actualiza datele companiei
- Vei avea acces la funcții premium pentru compania ta

Vezi compania: ${companyUrl}
Revendică compania: ${claimUrl}

Întrebări? Răspunde la acest email.

RoMarketCap`
      : `Hello,

We received your claim request for ${companyName}. Our team will review it in the coming days.

What's next:
- You'll receive an email when the claim is approved or rejected
- After approval, you'll be able to update company data
- You'll have access to premium features for your company

View company: ${companyUrl}
Claim company: ${claimUrl}

Questions? Reply to this email.

RoMarketCap`;

  return { subject, text };
}

export function claimDripEmailDay2(lang: Lang, companyName: string, companySlug: string, romcScore: number | null) {
  const baseUrl = getSiteUrl();
  const companyUrl = `${baseUrl}/company/${encodeURIComponent(companySlug)}`;
  const pricingUrl = `${baseUrl}/pricing`;

  const scoreText = romcScore != null ? `${romcScore}/100` : "N/A";

  const subject =
    lang === "ro"
      ? `Ce afectează scorul ROMC pentru ${companyName}?`
      : `What affects the ROMC score for ${companyName}?`;
  const text =
    lang === "ro"
      ? `Bună ziua,

Scorul ROMC actual pentru ${companyName} este ${scoreText}.

Ce afectează scorul ROMC:

1. Date financiare complete (cifră de afaceri, profit, angajați)
2. Website și prezență online activă
3. Date actualizate recent
4. Verificare prin claim (după aprobare)

După ce cererea ta de revendicare este aprobată, vei putea:
- Actualiza datele financiare
- Adăuga informații despre companie
- Îmbunătăți scorul ROMC

Vezi compania: ${companyUrl}
Vezi prețuri Premium: ${pricingUrl}

RoMarketCap`
      : `Hello,

The current ROMC score for ${companyName} is ${scoreText}.

What affects the ROMC score:

1. Complete financial data (revenue, profit, employees)
2. Website and active online presence
3. Recently updated data
4. Verification through claim (after approval)

After your claim is approved, you'll be able to:
- Update financial data
- Add company information
- Improve the ROMC score

View company: ${companyUrl}
See Premium pricing: ${pricingUrl}

RoMarketCap`;

  return { subject, text };
}

export function claimDripEmailDay5(lang: Lang, companyName: string, companySlug: string, isPremium: boolean) {
  const baseUrl = getSiteUrl();
  const companyUrl = `${baseUrl}/company/${encodeURIComponent(companySlug)}`;
  const pricingUrl = `${baseUrl}/pricing`;

  if (isPremium) {
    const subject = lang === "ro" ? `Premium activ pentru ${companyName}` : `Premium active for ${companyName}`;
    const text =
      lang === "ro"
        ? `Bună ziua,

Mulțumim că folosești Premium! Acum ai acces la:
- Forecast-uri 90/180 zile
- Rapoarte detaliate
- Comparații cu concurenții
- Export date

Vezi compania: ${companyUrl}

RoMarketCap`
        : `Hello,

Thank you for using Premium! You now have access to:
- 90/180 day forecasts
- Detailed reports
- Competitor comparisons
- Data exports

View company: ${companyUrl}

RoMarketCap`;

    return { subject, text };
  }

  const subject =
    lang === "ro"
      ? `Deblochează funcții Premium pentru ${companyName}`
      : `Unlock Premium features for ${companyName}`;
  const text =
    lang === "ro"
      ? `Bună ziua,

După aprobarea revendicării pentru ${companyName}, poți debloca funcții Premium:

✓ Forecast-uri 90/180 zile
✓ Analize detaliate și explicații
✓ Comparații cu concurenții
✓ Export date în CSV/JSON
✓ Alertă când scorul se schimbă

Premium începe de la €29/lună.

Vezi prețuri: ${pricingUrl}
Vezi compania: ${companyUrl}

RoMarketCap`
      : `Hello,

After your claim for ${companyName} is approved, you can unlock Premium features:

✓ 90/180 day forecasts
✓ Detailed analysis and explanations
✓ Competitor comparisons
✓ CSV/JSON data exports
✓ Alerts when score changes

Premium starts at €29/month.

See pricing: ${pricingUrl}
View company: ${companyUrl}

RoMarketCap`;

  return { subject, text };
}

