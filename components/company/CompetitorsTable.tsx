import Link from 'next/link';
import type { Lang } from '@/src/lib/i18n';

type CompetitorsTableProps = {
  company: {
    name: string;
    romcScore: number | null;
    revenue: number | null;
    employees: number | null;
  };
  competitors: Array<{
    slug: string;
    name: string;
    romcScore: number | null;
    revenueLatest: any;
    employees: number | null;
  }>;
  lang: Lang;
  currency?: string;
};

export function CompetitorsTable({ company, competitors, lang, currency = 'EUR' }: CompetitorsTableProps) {
  if (!competitors || competitors.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-card-foreground">
        <h3 className="text-sm font-medium">
          {lang === 'ro' ? 'Competitori' : 'Competitors'}
        </h3>
        <p className="mt-3 text-sm text-muted-foreground">
          {lang === 'ro' ? 'Nu există competitori identificați' : 'No competitors identified'}
        </p>
      </div>
    );
  }

  const formatMoney = (value: any) => {
    if (!value) return 'N/A';
    const num = typeof value === 'number' ? value : Number(String(value));
    if (!Number.isFinite(num)) return 'N/A';
    return new Intl.NumberFormat(lang === 'ro' ? 'ro-RO' : 'en-GB', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
      notation: num > 1000000 ? 'compact' : 'standard',
    }).format(num);
  };

  const formatNumber = (value: number | null) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat(lang === 'ro' ? 'ro-RO' : 'en-GB').format(value);
  };

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h3 className="text-sm font-medium">
        {lang === 'ro' ? 'Comparație cu competitori' : 'Competitor Comparison'}
      </h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b">
            <tr>
              <th className="py-2 font-medium">{lang === 'ro' ? 'Companie' : 'Company'}</th>
              <th className="py-2 font-medium text-right">
                {lang === 'ro' ? 'ROMC' : 'ROMC'}
              </th>
              <th className="py-2 font-medium text-right">
                {lang === 'ro' ? 'Venituri' : 'Revenue'}
              </th>
              <th className="py-2 font-medium text-right">
                {lang === 'ro' ? 'Angajați' : 'Employees'}
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Current company */}
            <tr className="border-b bg-primary/5">
              <td className="py-3 font-medium">{company.name}</td>
              <td className="py-3 text-right font-semibold">
                {company.romcScore !== null ? `${company.romcScore}/100` : 'N/A'}
              </td>
              <td className="py-3 text-right">{formatMoney(company.revenue)}</td>
              <td className="py-3 text-right">{formatNumber(company.employees)}</td>
            </tr>
            {/* Competitors */}
            {competitors.map((competitor) => (
              <tr key={competitor.slug} className="border-b hover:bg-muted/50 transition-colors">
                <td className="py-3">
                  <Link href={`/company/${competitor.slug}`} className="hover:text-primary transition-colors">
                    {competitor.name}
                  </Link>
                </td>
                <td className="py-3 text-right">
                  {competitor.romcScore !== null ? `${competitor.romcScore}/100` : 'N/A'}
                </td>
                <td className="py-3 text-right">{formatMoney(competitor.revenueLatest)}</td>
                <td className="py-3 text-right">{formatNumber(competitor.employees)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
