"use client";

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ro, enUS } from 'date-fns/locale';
import type { Lang } from '@/src/lib/i18n';

type NewsArticle = {
  title: string;
  url: string;
  publishedAt: string;
  snippet?: string;
  source?: string;
};

type NewsFeedProps = {
  companyName: string;
  companyCui: string;
  lang: Lang;
  limit?: number;
};

export function NewsFeed({ companyName, companyCui, lang, limit = 5 }: NewsFeedProps) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          name: companyName,
          lang,
          limit: limit.toString(),
        });
        
        const response = await fetch(`/api/company/${companyCui}/news?${params}`);
        const data = await response.json();

        if (data.ok) {
          setArticles(data.articles || []);
        } else {
          setError(data.error || 'Failed to load news');
        }
      } catch (err) {
        console.error('[NewsFeed] Error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load news');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [companyName, companyCui, lang, limit]);

  if (loading) {
    return (
      <div className="rounded-xl border bg-card p-6 text-card-foreground">
        <h3 className="text-sm font-medium">
          {lang === 'ro' ? 'Știri' : 'News'}
        </h3>
        <div className="mt-3 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || articles.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-6 text-card-foreground">
        <h3 className="text-sm font-medium">
          {lang === 'ro' ? 'Știri' : 'News'}
        </h3>
        <p className="mt-3 text-sm text-muted-foreground">
          {lang === 'ro' ? 'Nu există știri recente' : 'No recent news available'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h3 className="text-sm font-medium">
        {lang === 'ro' ? 'Știri recente' : 'Recent News'}
      </h3>
      <div className="mt-3 space-y-4">
        {articles.map((article, idx) => (
          <a
            key={idx}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <h4 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
              {article.title}
            </h4>
            {article.snippet && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {article.snippet}
              </p>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {article.source && <span>{article.source}</span>}
              <span>•</span>
              <span>
                {formatDistanceToNow(new Date(article.publishedAt), {
                  addSuffix: true,
                  locale: lang === 'ro' ? ro : enUS,
                })}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
