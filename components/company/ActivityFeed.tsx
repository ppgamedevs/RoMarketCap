import { formatDistanceToNow } from 'date-fns';
import { ro, enUS } from 'date-fns/locale';
import type { Lang } from '@/src/lib/i18n';
import type { CompanyChangeLog } from '@prisma/client';

type ActivityFeedProps = {
  changes: CompanyChangeLog[];
  lang: Lang;
};

export function ActivityFeed({ changes, lang }: ActivityFeedProps) {
  if (!changes || changes.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-card-foreground">
        <h3 className="text-sm font-medium">
          {lang === 'ro' ? 'Activitate recentă' : 'Recent Activity'}
        </h3>
        <p className="mt-3 text-sm text-muted-foreground">
          {lang === 'ro' ? 'Nu există activitate recentă' : 'No recent activity'}
        </p>
      </div>
    );
  }

  const getActivityIcon = (field: string) => {
    if (field.includes('score') || field.includes('Score')) return '📊';
    if (field.includes('financial') || field.includes('revenue') || field.includes('profit')) return '💰';
    if (field.includes('employee')) return '👥';
    if (field.includes('name') || field.includes('description')) return '✏️';
    return '🔄';
  };

  const formatFieldName = (field: string): string => {
    if (lang === 'ro') {
      const translations: Record<string, string> = {
        'romcScore': 'ROMC Score',
        'romcAiScore': 'ROMC AI Score',
        'dataConfidence': 'Încredere date',
        'companyIntegrityScore': 'Scor integritate',
        'revenueLatest': 'Venituri',
        'profitLatest': 'Profit',
        'employees': 'Angajați',
        'name': 'Nume',
        'description': 'Descriere',
      };
      return translations[field] || field;
    }
    return field.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
  };

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h3 className="text-sm font-medium">
        {lang === 'ro' ? 'Activitate recentă' : 'Recent Activity'}
      </h3>
      <div className="mt-3 space-y-3">
        {changes.slice(0, 10).map((change) => (
          <div key={change.id} className="flex gap-3 text-sm">
            <span className="text-lg" aria-hidden="true">
              {getActivityIcon(change.field)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{formatFieldName(change.field)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {change.oldValue && change.newValue ? (
                  <>
                    {String(change.oldValue)} → {String(change.newValue)}
                  </>
                ) : change.newValue ? (
                  <>
                    {lang === 'ro' ? 'Actualizat la' : 'Updated to'} {String(change.newValue)}
                  </>
                ) : (
                  lang === 'ro' ? 'Modificat' : 'Changed'
                )}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(change.createdAt, {
                  addSuffix: true,
                  locale: lang === 'ro' ? ro : enUS,
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
