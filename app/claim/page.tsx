import Link from "next/link";

type SearchParams = Promise<{ company?: string }>;

export default async function ClaimPage(props: { searchParams: SearchParams }) {
  const { company } = await props.searchParams;
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Claim company</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Stub page. Claim flow will be implemented later.
      </p>
      <p className="mt-4 text-sm">
        Company: <span className="font-medium">{company ?? "N/A"}</span>
      </p>
      <div className="mt-6 text-sm">
        <Link className="underline underline-offset-4" href={company ? `/company/${company}` : "/company"}>
          Back
        </Link>
      </div>
    </main>
  );
}


