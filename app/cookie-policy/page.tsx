import type { Metadata } from "next";
import { getLangFromRequest } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { Card, CardBody } from "@/components/ui/Card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Politica de Cookie-uri - RoMarketCap" : "Cookie Policy - RoMarketCap";
  const canonical = `${getSiteUrl()}/cookie-policy`;
  return { title, alternates: { canonical } };
}

export default async function CookiePolicyPage() {
  const lang = await getLangFromRequest();
  const contact = "contact@romarketcap.ro";

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {lang === "ro" ? "Politica de Cookie-uri" : "Cookie Policy"}
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
                <h2 className="text-base font-semibold text-foreground mb-2">Ce sunt cookie-urile?</h2>
                <p>
                  Cookie-urile sunt fișiere text mici care sunt plasate pe dispozitivul dvs. când vizitați un site web.
                  Acestea permit site-ului să-și amintească acțiunile și preferințele dvs. pe o perioadă de timp, astfel
                  încât nu trebuie să le reintroduceți de fiecare dată când reveniți la site sau navigați de la o pagină
                  la alta.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">Ce cookie-uri folosim?</h2>
                <p>
                  RoMarketCap folosește Google Analytics pentru a înțelege modul în care vizitatorii interacționează cu
                  site-ul nostru. Google Analytics folosește cookie-uri pentru a colecta informații despre utilizarea
                  site-ului, inclusiv:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Numărul de vizitatori</li>
                  <li>Pagina de unde au venit vizitatorii</li>
                  <li>Pagina pe care o vizitează</li>
                  <li>Timpul petrecut pe site</li>
                </ul>
                <p className="mt-2">
                  Aceste informații ne ajută să îmbunătățim site-ul și serviciile noastre. Datele sunt anonime și nu
                  identificăm utilizatorii individuali.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">Scopul cookie-urilor</h2>
                <p>
                  Cookie-urile pe care le folosim sunt necesare pentru funcționarea corectă a site-ului și pentru a ne
                  ajuta să înțelegem cum îl folosesc vizitatorii. Nu folosim cookie-uri pentru publicitate sau pentru a
                  urmări utilizatorii pe alte site-uri.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">Cum să gestionați cookie-urile</h2>
                <p>
                  Puteți controla și/sau șterge cookie-urile după cum doriți. Puteți șterge toate cookie-urile care sunt
                  deja pe computerul dvs. și puteți seta majoritatea browserelor pentru a preveni plasarea acestora.
                </p>
                <p className="mt-2">
                  Dacă faceți acest lucru, este posibil să trebuiască să ajustați manual unele preferințe de fiecare dată
                  când vizitați un site, iar unele servicii și funcții pot să nu funcționeze.
                </p>
                <p className="mt-2">
                  Puteți dezactiva cookie-urile Google Analytics instalând{" "}
                  <a
                    href="https://tools.google.com/dlpage/gaoptout"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Google Analytics Opt-out Browser Add-on
                  </a>
                  .
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">Contact</h2>
                <p>
                  Dacă aveți întrebări despre politica noastră de cookie-uri, vă rugăm să ne contactați la{" "}
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
                <h2 className="text-base font-semibold text-foreground mb-2">What are cookies?</h2>
                <p>
                  Cookies are small text files that are placed on your device when you visit a website. They allow the
                  website to remember your actions and preferences over a period of time, so you don't have to keep
                  re-entering them whenever you come back to the site or browse from one page to another.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">What cookies do we use?</h2>
                <p>
                  RoMarketCap uses Google Analytics to understand how visitors interact with our website. Google
                  Analytics uses cookies to collect information about website usage, including:
                </p>
                <ul className="list-disc list-inside mt-2 space-y-1 ml-4">
                  <li>Number of visitors</li>
                  <li>Where visitors came from</li>
                  <li>Which pages they visit</li>
                  <li>Time spent on the site</li>
                </ul>
                <p className="mt-2">
                  This information helps us improve our website and services. The data is anonymous and we do not identify
                  individual users.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">Purpose of cookies</h2>
                <p>
                  The cookies we use are necessary for the proper functioning of the website and to help us understand
                  how visitors use it. We do not use cookies for advertising or to track users across other websites.
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">How to manage cookies</h2>
                <p>
                  You can control and/or delete cookies as you wish. You can delete all cookies that are already on your
                  computer and you can set most browsers to prevent them from being placed.
                </p>
                <p className="mt-2">
                  If you do this, you may have to manually adjust some preferences every time you visit a site, and some
                  services and functions may not work.
                </p>
                <p className="mt-2">
                  You can disable Google Analytics cookies by installing the{" "}
                  <a
                    href="https://tools.google.com/dlpage/gaoptout"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Google Analytics Opt-out Browser Add-on
                  </a>
                  .
                </p>
              </section>

              <section>
                <h2 className="text-base font-semibold text-foreground mb-2">Contact</h2>
                <p>
                  If you have questions about our cookie policy, please contact us at{" "}
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

