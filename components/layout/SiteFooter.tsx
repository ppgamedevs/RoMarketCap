import Link from "next/link";
import { getLangFromRequest } from "@/src/lib/i18n";
import { NewsletterCta } from "@/components/newsletter/NewsletterCta";

export async function SiteFooter() {
  const lang = await getLangFromRequest();
  const contact = "contact@romarketcap.ro";

  return (
    <footer className="mt-12 border-t">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-8 text-sm">
        <div className="max-w-lg">
          <NewsletterCta lang={lang} placement="footer" />
        </div>
        <div className="flex flex-wrap gap-4">
          <Link className="underline underline-offset-4" href="/pricing">
            {lang === "ro" ? "Prețuri" : "Pricing"}
          </Link>
          <Link className="underline underline-offset-4" href="/terms">
            {lang === "ro" ? "Termeni" : "Terms"}
          </Link>
          <Link className="underline underline-offset-4" href="/privacy">
            {lang === "ro" ? "Confidențialitate" : "Privacy"}
          </Link>
          <Link className="underline underline-offset-4" href="/disclaimer">
            {lang === "ro" ? "Disclaimer" : "Disclaimer"}
          </Link>
          <Link className="underline underline-offset-4" href="/methodology">
            {lang === "ro" ? "Metodologie" : "Methodology"}
          </Link>
          <a className="underline underline-offset-4" href={`mailto:${contact}`}>
            {lang === "ro" ? "Contact" : "Contact"}
          </a>
          <Link className="underline underline-offset-4" href="/invite">
            {lang === "ro" ? "Invite" : "Invite"}
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          {lang === "ro"
            ? "RoMarketCap oferă estimări și informații. Nu este consultanță financiară."
            : "RoMarketCap provides estimates and information. Not financial advice."}
        </p>
      </div>
    </footer>
  );
}


