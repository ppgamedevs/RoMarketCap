import type { Metadata } from "next";
import { getLangFromRequest } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { Card, CardBody } from "@/components/ui/Card";

export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Metodologie - RoMarketCap" : "Methodology - RoMarketCap";
  const canonical = `${getSiteUrl()}/methodology`;
  return { title, alternates: { canonical } };
}

export default async function MethodologyPage() {
  const lang = await getLangFromRequest();
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{lang === "ro" ? "Metodologie" : "Methodology"}</h1>
      </header>
      <Card className="mt-6">
        <CardBody className="space-y-4 text-sm text-muted-foreground leading-6">
        <p>
          {lang === "ro"
            ? "ROMC v1 este un scor determinist (0-100) bazat pe website, vechime, angajați, venituri, profit, descriere și completitudine."
            : "ROMC v1 is a deterministic score (0-100) based on website, age, employees, revenue, profit, description, and completeness."}
        </p>
        <p>
          {lang === "ro"
            ? "ROMC AI este un scor separat, orientat pe încredere și semnale de momentum: completitudine, prospețime, claim aprobat, submissions aprobate."
            : "ROMC AI is a separate score focused on trust and momentum signals: completeness, freshness, approved claim, approved submissions."}
        </p>
        <p>
          {lang === "ro"
            ? "Încrederea (confidence) crește când avem mai multe câmpuri și istoric. Forecast-ul pred-v1 proiectează scorul în 30/90/180 zile folosind trend și fundamente, cu bandă de incertitudine."
            : "Confidence increases with more fields and history. pred-v1 forecast projects the score over 30/90/180 days using trend and fundamentals with an uncertainty band."}
        </p>
        <p>
          {lang === "ro"
            ? "Limitări: lipsa datelor, schimbări de piață, estimări conservatoare. Valorile pot fi actualizate."
            : "Limitations: missing data, market changes, conservative estimates. Values may change."}
        </p>

        <h2 className="pt-4 text-sm font-medium text-foreground">{lang === "ro" ? "Estimări, nu consultanță" : "Estimates, not advice"}</h2>
        <p>
          {lang === "ro"
            ? "ROMC, forecast-urile și evaluările sunt estimări informative. Nu oferim consultanță financiară, investițională sau juridică."
            : "ROMC, forecasts, and valuation ranges are informational estimates. We do not provide financial, investment, or legal advice."}
        </p>

        <h2 className="pt-4 text-sm font-medium text-foreground">{lang === "ro" ? "Surse de date" : "Data sources"}</h2>
        <ul className="list-disc pl-5">
          <li>{lang === "ro" ? "Public filings (unde sunt disponibile)" : "Public filings (where available)"}</li>
          <li>{lang === "ro" ? "Actualizări trimise de utilizatori, verificate prin moderare" : "User submissions, verified via moderation"}</li>
          <li>{lang === "ro" ? "Semnale automate (ex: metadata website, linkuri sociale)" : "Automated signals (e.g. website metadata, social links)"}</li>
          <li>{lang === "ro" ? "Date agregate din surse publice (SEAP, Fonduri UE)" : "Data aggregated from public sources (SEAP, EU Funds)"}</li>
        </ul>
        <p className="pt-2 text-xs italic">
          {lang === "ro"
            ? "⚠️ Datele sunt agregate din surse publice și pot fi incomplete. Nu constituie consultanță financiară sau recomandare de investiții."
            : "⚠️ Data is aggregated from public sources and may be incomplete. Does not constitute financial advice or investment recommendation."}
        </p>

        <h2 className="pt-4 text-sm font-medium text-foreground">{lang === "ro" ? "Verificare ANAF" : "ANAF Verification"}</h2>
        <p>
          {lang === "ro"
            ? "RoMarketCap verifică existența și statusul legal al companiilor prin ANAF (Agenția Națională de Administrare Fiscală) în mod sigur și conform."
            : "RoMarketCap verifies company existence and legal status through ANAF (National Agency for Fiscal Administration) in a safe and compliant manner."}
        </p>
        <p>
          {lang === "ro"
            ? "Verificarea ANAF confirmă:"
            : "ANAF verification confirms:"}
        </p>
        <ul className="list-disc pl-5">
          <li>{lang === "ro" ? "Existența companiei în registrul fiscal" : "Company existence in the fiscal registry"}</li>
          <li>{lang === "ro" ? "Statusul activ/inactiv" : "Active/inactive status"}</li>
          <li>{lang === "ro" ? "Înregistrarea ca plătitor TVA (dacă este cazul)" : "VAT registration status (if applicable)"}</li>
        </ul>
        <p className="pt-2">
          {lang === "ro"
            ? "Verificarea ANAF NU înseamnă:"
            : "ANAF verification does NOT mean:"}
        </p>
        <ul className="list-disc pl-5">
          <li>{lang === "ro" ? "Validare financiară sau solvabilitate" : "Financial validation or solvency"}</li>
          <li>{lang === "ro" ? "Aprobare sau recomandare pentru investiții" : "Approval or recommendation for investments"}</li>
          <li>{lang === "ro" ? "Garantie a calității serviciilor sau produselor" : "Guarantee of service or product quality"}</li>
        </ul>
        <p className="pt-2 text-xs italic">
          {lang === "ro"
            ? "Verificarea ANAF este o confirmare a existenței legale și a statusului fiscal. Aceasta crește încrederea în date, dar nu înlocuiește analiza financiară sau consultanța profesională."
            : "ANAF verification is a confirmation of legal existence and fiscal status. This increases trust in data, but does not replace financial analysis or professional advice."}
        </p>
        </CardBody>
      </Card>
    </main>
  );
}


