import type { Lang } from "@/src/lib/i18n";

export function RefundNote({ lang }: { lang: Lang }) {
  return (
    <div className="rounded-md border bg-muted/50 p-4 text-sm">
      <p className="font-medium">{lang === "ro" ? "Rambursări și anulări" : "Refunds & Cancellations"}</p>
      <p className="mt-2 text-muted-foreground">
        {lang === "ro"
          ? "Poți anula abonamentul oricând din pagina de facturare. Rambursările sunt evaluate caz cu caz. Contactează-ne dacă ai întrebări. (Aceasta nu este consultanță juridică.)"
          : "You can cancel your subscription anytime from the billing page. Refunds are evaluated case by case. Contact us if you have questions. (This is not legal advice.)"}
      </p>
    </div>
  );
}

