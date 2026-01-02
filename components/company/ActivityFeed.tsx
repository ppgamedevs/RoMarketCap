import { formatDistanceToNow } from 'date-fns';
import { ro, enUS } from 'date-fns/locale';
import type { Lang } from '@/src/lib/i18n';
import type { CompanyChangeLog, CompanyChangeType } from '@prisma/client';

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

  const getActivityIcon = (changeType: CompanyChangeType) => {
    switch (changeType) {
      case 'SCORE_CHANGE':
        return '📊';
      case 'FINANCIAL_SYNC':
        return '💰';
      case 'ENRICHMENT':
        return '✏️';
      case 'CLAIM_APPROVED':
        return '✅';
      case 'SUBMISSION_APPROVED':
        return '✓';
      case 'FORECAST_CHANGE':
        return '📈';
      default:
        return '🔄';
    }
  };

  const formatChangeType = (changeType: CompanyChangeType): string => {
    if (lang === 'ro') {
      const translations: Record<CompanyChangeType, string> = {
        'SCORE_CHANGE': 'Actualizare scor',
        'FINANCIAL_SYNC': 'Sincronizare financiară',
        'ENRICHMENT': 'Îmbogățire date',
        'CLAIM_APPROVED': 'Revendicare aprobată',
        'SUBMISSION_APPROVED': 'Contribuție aprobată',
        'FORECAST_CHANGE': 'Prognoză actualizată',
      };
      return translations[changeType] || changeType;
    }
    return changeType.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatMetadata = (metadata: any): string => {
    if (!metadata) return '';
    if (typeof metadata === 'object') {
      if (metadata.oldValue && metadata.newValue) {
        return `${metadata.oldValue} → ${metadata.newValue}`;
      }
      if (metadata.field) {
        return metadata.field;
      }
      return JSON.stringify(metadata);
    }
    return String(metadata);
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
              {getActivityIcon(change.changeType)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-medium">{formatChangeType(change.changeType)}</p>
              {change.metadata && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatMetadata(change.metadata)}
                </p>
              )}
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
