import type { Metadata } from "next";
import { getLangFromRequest } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { Card, CardBody } from "@/components/ui/Card";

export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Termeni și Condiții - RoMarketCap" : "Terms & Conditions - RoMarketCap";
  const canonical = `${getSiteUrl()}/terms`;
  return { title, alternates: { canonical } };
}

export default async function TermsPage() {
  const lang = await getLangFromRequest();
  const contact = "contact@romarketcap.ro";

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {lang === "ro" ? "Termeni și Condiții" : "Terms & Conditions"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ro"
            ? "Ultima actualizare: ianuarie 2025"
            : "Last updated: January 2025"}
        </p>
      </header>

      <Card className="mt-6">
        <CardBody className="space-y-6 text-sm text-muted-foreground leading-6">
          {lang === "ro" ? (
            <>
              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">1. Descrierea serviciului</h2>
                <p>
                  RoMarketCap este o platformă online care oferă informații, estimări și analize despre companiile din
                  România. Serviciile noastre includ, dar nu se limitează la, afișarea de date despre companii, scoruri
                  de evaluare, previziuni și alte informații financiare.
                </p>
                <p className="mt-2">
                  Informațiile furnizate pe RoMarketCap sunt estimate și nu constituie consultanță financiară, juridică
                  sau fiscală.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">2. Obligațiile utilizatorului</h2>
                <p>Prin utilizarea serviciilor noastre, vă angajați să:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Furnizați informații corecte și actualizate la înregistrare</li>
                  <li>Păstrați confidențialitatea contului dvs. și a parolei</li>
                  <li>Nu utilizați serviciile în scopuri ilegale sau frauduloase</li>
                  <li>Nu încercați să accesați sau să perturbați sistemele noastre</li>
                  <li>Respectați toate legile și reglementările aplicabile</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">3. Proprietate intelectuală</h2>
                <p>
                  Toate conținuturile, design-ul, logo-urile și alte materiale de pe RoMarketCap sunt proprietatea
                  noastră sau a licențiatorilor noștri și sunt protejate de legile privind drepturile de autor și
                  proprietatea intelectuală.
                </p>
                <p className="mt-2">
                  Nu puteți copia, reproduce, distribui sau utiliza conținutul nostru fără permisiunea noastră scrisă,
                  cu excepția utilizării personale și necomerciale.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">4. Limitarea răspunderii</h2>
                <p>
                  RoMarketCap este furnizat "așa cum este" și "conform disponibilității". Nu garantăm că serviciile
                  vor fi neîntrerupte, securizate sau fără erori.
                </p>
                <p className="mt-2">
                  Nu ne facem responsabili pentru orice daune directe, indirecte, incidentale, speciale sau
                  consecvente rezultate din utilizarea sau imposibilitatea utilizării serviciilor noastre.
                </p>
                <p className="mt-2">
                  Informațiile de pe RoMarketCap sunt estimate și nu ar trebui să fie singura bază pentru decizii
                  financiare importante. Vă recomandăm să consultați un consultant financiar profesionist înainte de a
                  lua astfel de decizii.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">5. Modificări ale termenilor</h2>
                <p>
                  Ne rezervăm dreptul de a modifica acești termeni în orice moment. Modificările vor intra în vigoare
                  imediat după publicarea pe site. Utilizarea continuă a serviciilor după modificări constituie
                  acceptarea termenilor actualizați.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">6. Legea aplicabilă</h2>
                <p>
                  Acești termeni sunt guvernați de legile României. Orice dispute vor fi rezolvate de instanțele
                  competente din România.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">7. Contact</h2>
                <p>
                  Pentru întrebări despre acești termeni, vă rugăm să ne contactați la{" "}
                  <a href={`mailto:${contact}`} className="text-primary underline">
                    {contact}
                  </a>
                  .
                </p>
              </section>
            </>
          ) : (
            <>
              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">1. Service Description</h2>
                <p>
                  RoMarketCap is an online platform that provides information, estimates, and analysis about companies
                  in Romania. Our services include, but are not limited to, displaying company data, valuation scores,
                  forecasts, and other financial information.
                </p>
                <p className="mt-2">
                  The information provided on RoMarketCap is estimated and does not constitute financial, legal, or tax
                  advice.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">2. User Obligations</h2>
                <p>By using our services, you agree to:</p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Provide accurate and up-to-date information upon registration</li>
                  <li>Maintain the confidentiality of your account and password</li>
                  <li>Not use the services for illegal or fraudulent purposes</li>
                  <li>Not attempt to access or disrupt our systems</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">3. Intellectual Property</h2>
                <p>
                  All content, design, logos, and other materials on RoMarketCap are our property or that of our
                  licensors and are protected by copyright and intellectual property laws.
                </p>
                <p className="mt-2">
                  You may not copy, reproduce, distribute, or use our content without our written permission, except for
                  personal and non-commercial use.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">4. Limitation of Liability</h2>
                <p>
                  RoMarketCap is provided "as is" and "as available". We do not guarantee that the services will be
                  uninterrupted, secure, or error-free.
                </p>
                <p className="mt-2">
                  We are not liable for any direct, indirect, incidental, special, or consequential damages resulting
                  from the use or inability to use our services.
                </p>
                <p className="mt-2">
                  The information on RoMarketCap is estimated and should not be the sole basis for important financial
                  decisions. We recommend consulting a professional financial advisor before making such decisions.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">5. Changes to Terms</h2>
                <p>
                  We reserve the right to modify these terms at any time. Changes will take effect immediately upon
                  posting on the website. Continued use of the services after changes constitutes acceptance of the
                  updated terms.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">6. Governing Law</h2>
                <p>
                  These terms are governed by the laws of Romania. Any disputes will be resolved by the competent
                  courts of Romania.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">7. Contact</h2>
                <p>
                  For questions about these terms, please contact us at{" "}
                  <a href={`mailto:${contact}`} className="text-primary underline">
                    {contact}
                  </a>
                  .
                </p>
              </section>
            </>
          )}
        </CardBody>
      </Card>
    </main>
  );
}
