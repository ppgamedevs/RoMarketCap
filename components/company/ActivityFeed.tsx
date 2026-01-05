import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ro, enUS } from 'date-fns/locale';
import type { Lang } from '@/src/lib/i18n';
import type { CompanyChangeLog, CompanyChangeType } from '@prisma/client';
import { BarChart3, DollarSign, Edit, CheckCircle2, TrendingUp, RefreshCw } from 'lucide-react';

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
        return BarChart3;
      case 'FINANCIAL_SYNC':
        return DollarSign;
      case 'ENRICHMENT':
        return Edit;
      case 'CLAIM_APPROVED':
        return CheckCircle2;
      case 'SUBMISSION_APPROVED':
        return CheckCircle2;
      case 'FORECAST_CHANGE':
        return TrendingUp;
      default:
        return RefreshCw;
    }
  };

  const getActivityColor = (changeType: CompanyChangeType): string => {
    switch (changeType) {
      case 'SCORE_CHANGE':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'FINANCIAL_SYNC':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'ENRICHMENT':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'CLAIM_APPROVED':
      case 'SUBMISSION_APPROVED':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'FORECAST_CHANGE':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
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

  const formatMetadata = (metadata: any): React.ReactNode => {
    if (!metadata) return null;
    if (typeof metadata === 'object') {
      const entries = Object.entries(metadata).filter(([_, v]) => v != null);
      if (entries.length === 0) return null;
      
      // If it's a simple oldValue -> newValue change
      if (metadata.oldValue && metadata.newValue) {
        return (
          <div className="mt-1 flex items-center gap-2 text-xs">
            <span className="text-muted-foreground line-through">{String(metadata.oldValue)}</span>
            <span className="text-muted-foreground">→</span>
            <span className="font-medium">{String(metadata.newValue)}</span>
          </div>
        );
      }
      
      // Display key-value pairs
      return (
        <div className="mt-1 space-y-1">
          {entries.slice(0, 3).map(([key, value]) => (
            <div key={key} className="text-xs">
              <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
              <span className="font-medium">{String(value)}</span>
            </div>
          ))}
        </div>
      );
    }
    return <p className="text-xs text-muted-foreground mt-0.5">{String(metadata)}</p>;
  };

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h3 className="text-sm font-medium">
        {lang === 'ro' ? 'Activitate recentă' : 'Recent Activity'}
      </h3>
      <div className="mt-3 space-y-3">
        {changes.slice(0, 10).map((change) => {
          const Icon = getActivityIcon(change.changeType);
          const colorClass = getActivityColor(change.changeType);
          const relativeTime = formatDistanceToNow(change.createdAt, {
            addSuffix: true,
            locale: lang === 'ro' ? ro : enUS,
          });
          const absoluteDate = change.createdAt.toLocaleDateString(
            lang === 'ro' ? 'ro-RO' : 'en-US',
            { year: 'numeric', month: 'short', day: 'numeric' }
          );

          return (
            <div
              key={change.id}
              className={`rounded-lg border p-3 transition-all hover:shadow-sm ${colorClass}`}
            >
              <div className="flex gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${colorClass}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{formatChangeType(change.changeType)}</p>
                  {change.metadata && formatMetadata(change.metadata)}
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{relativeTime}</span>
                    <span>•</span>
                    <span>{absoluteDate}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
