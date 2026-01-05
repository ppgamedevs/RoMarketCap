import Link from "next/link";
import type { Lang } from "@/src/lib/i18n";
import { NewsletterCta } from "@/components/newsletter/NewsletterCta";

export function SiteFooter({ lang }: { lang: Lang }) {
  const contact = "contact@romarketcap.ro";

  return (
    <footer className="border-t bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Column 1: Newsletter CTA */}
          <div className="lg:col-span-1">
            <NewsletterCta lang={lang} placement="footer" />
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">
              {lang === "ro" ? "Linkuri rapide" : "Quick Links"}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/pricing">
                  {lang === "ro" ? "Prețuri" : "Pricing"}
                </Link>
              </li>
              <li>
                <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/terms">
                  {lang === "ro" ? "Termeni" : "Terms"}
                </Link>
              </li>
              <li>
                <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/privacy">
                  {lang === "ro" ? "Confidențialitate" : "Privacy"}
                </Link>
              </li>
              <li>
                <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/cookie-policy">
                  {lang === "ro" ? "Cookie-uri" : "Cookies"}
                </Link>
              </li>
              <li>
                <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/disclaimer">
                  {lang === "ro" ? "Disclaimer" : "Disclaimer"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Resources */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">
              {lang === "ro" ? "Resurse" : "Resources"}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/methodology">
                  {lang === "ro" ? "Metodologie" : "Methodology"}
                </Link>
              </li>
              <li>
                <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/api-docs">
                  {lang === "ro" ? "Documentație API" : "API Documentation"}
                </Link>
              </li>
              <li>
                <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/about">
                  {lang === "ro" ? "Despre" : "About"}
                </Link>
              </li>
              <li>
                <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/invite">
                  {lang === "ro" ? "Invite" : "Invite"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Company Info */}
          <div>
            <h3 className="mb-4 text-sm font-semibold">
              {lang === "ro" ? "Companie" : "Company"}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a className="text-muted-foreground hover:text-foreground transition-colors" href={`mailto:${contact}`}>
                  {lang === "ro" ? "Contact" : "Contact"}
                </a>
              </li>
              <li>
                <Link className="text-muted-foreground hover:text-foreground transition-colors" href="/about">
                  {lang === "ro" ? "Despre noi" : "About Us"}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 border-t pt-6">
          <p className="text-xs text-muted-foreground text-center">
            {lang === "ro"
              ? "RoMarketCap oferă estimări și informații. Nu este consultanță financiară."
              : "RoMarketCap provides estimates and information. Not financial advice."}
          </p>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            © {new Date().getFullYear()} RoMarketCap. {lang === "ro" ? "Toate drepturile rezervate." : "All rights reserved."}
          </p>
        </div>
      </div>
    </footer>
  );
}


