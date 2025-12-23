export type FaqItem = { q: string; a: string } | { question: string; answer: string };

export function Faq({ items, lang }: { items: FaqItem[]; lang?: "ro" | "en" }) {
  return (
    <section className="rounded-xl border bg-card p-6 text-card-foreground">
      <h2 className="text-sm font-medium">{lang === "ro" ? "Întrebări frecvente" : "Frequently Asked Questions"}</h2>
      <div className="mt-4 space-y-2">
        {items.map((it, idx) => {
          const q = "q" in it ? it.q : it.question;
          const a = "a" in it ? it.a : it.answer;
          return (
            <details key={idx} className="rounded-md border px-3 py-2">
              <summary className="cursor-pointer text-sm font-medium">{q}</summary>
              <p className="mt-2 text-sm text-muted-foreground leading-6">{a}</p>
            </details>
          );
        })}
      </div>
    </section>
  );
}


