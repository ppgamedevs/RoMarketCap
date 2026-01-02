import Link from 'next/link';
import type { Lang } from '@/src/lib/i18n';

type SimilarCompaniesWidgetProps = {
  companies: Array<{
    slug: string;
    name: string;
    romcScore: number | null;
    industry: string | null;
  }>;
  lang: Lang;
};

export function SimilarCompaniesWidget({ companies, lang }: SimilarCompaniesWidgetProps) {
  if (!companies || companies.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h3 className="text-sm font-medium">
        {lang === 'ro' ? 'Companii similare' : 'Similar Companies'}
      </h3>
      <div className="mt-3 space-y-3">
        {companies.map((company) => (
          <Link
            key={company.slug}
            href={`/company/${company.slug}`}
            className="block group"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                  {company.name}
                </p>
                {company.industry && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {company.industry}
                  </p>
                )}
              </div>
              {company.romcScore !== null && (
                <div className="ml-3 flex items-center justify-center rounded-full bg-primary/10 px-2 py-1">
                  <span className="text-xs font-semibold text-primary">
                    {company.romcScore}
                  </span>
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
