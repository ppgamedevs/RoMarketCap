import Link from "next/link";

export const runtime = "nodejs";

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Despre RoMarketCap</h1>
      <p className="mt-3 text-sm text-muted-foreground leading-6">
        RoMarketCap este o platformă informativă pentru companii private din România. Scorurile și estimările sunt
        orientative și se bazează pe date publice și semnale agregate.
      </p>
      <p className="mt-4 text-sm text-muted-foreground">
        Estimări. Doar informativ. Nu este consultanță financiară.
      </p>
      <div className="mt-6 flex gap-4 text-sm">
        <Link className="underline underline-offset-4" href="/company">
          Companii
        </Link>
        <Link className="underline underline-offset-4" href="/pricing">
          Prețuri
        </Link>
        <Link className="underline underline-offset-4" href={`/lang?lang=en&next=${encodeURIComponent("/about")}`}>
          English
        </Link>
      </div>
    </main>
  );
}


