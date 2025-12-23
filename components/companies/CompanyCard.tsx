import Link from "next/link";

export function CompanyCard(props: {
  slug: string;
  name: string;
  cui: string | null;
  county: string | null;
  industrySlug: string | null;
  romcScore: number | null;
  romcConfidence: number | null;
  valuationRangeLow: unknown;
  valuationRangeHigh: unknown;
}) {
  const vLow = props.valuationRangeLow != null ? Number(String(props.valuationRangeLow)) : null;
  const vHigh = props.valuationRangeHigh != null ? Number(String(props.valuationRangeHigh)) : null;
  const valuation = vLow != null && vHigh != null ? `${vLow.toFixed(0)}-${vHigh.toFixed(0)} EUR` : "N/A";

  return (
    <Link
      href={`/company/${props.slug}`}
      className="group rounded-xl border bg-card p-4 text-card-foreground shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-base font-semibold leading-tight">{props.name}</p>
          <p className="text-xs text-muted-foreground">
            CUI {props.cui ?? "N/A"} {props.county ? `· ${props.county}` : ""} {props.industrySlug ? `· ${props.industrySlug}` : ""}
          </p>
          <p className="text-xs text-muted-foreground">Valuation: {valuation}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            {props.romcScore != null ? `${props.romcScore}/100` : "N/A"}
          </span>
          <span className="text-xs text-muted-foreground">
            {props.romcConfidence != null ? `Conf ${props.romcConfidence}` : "Confidence N/A"}
          </span>
        </div>
      </div>
    </Link>
  );
}
