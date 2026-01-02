import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RSSItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
  creator?: string;
  isoDate?: string;
};

type NewsArticle = {
  title: string;
  url: string;
  publishedAt: string;
  snippet?: string;
  source?: string;
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ cui: string }> }
) {
  try {
    const { cui } = await params;
    const { searchParams } = new URL(req.url);
    const lang = searchParams.get('lang') || 'ro';
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const companyName = searchParams.get('name') || '';

    if (!companyName) {
      return NextResponse.json({
        ok: false,
        error: 'Company name is required',
      }, { status: 400 });
    }

    // Check cache first
    const cacheKey = `news:${cui}:${lang}`;
    const cached = await kv.get<NewsArticle[]>(cacheKey).catch(() => null);
    
    if (cached) {
      return NextResponse.json({
        ok: true,
        articles: cached.slice(0, limit),
        cached: true,
      });
    }

    // Fetch from Google News RSS
    const parser = new Parser({
      customFields: {
        item: ['media:content', 'media:thumbnail']
      }
    });

    const searchQuery = encodeURIComponent(companyName);
    const rssUrl = `https://news.google.com/rss/search?q=${searchQuery}&hl=${lang}`;

    const feed = await parser.parseURL(rssUrl);
    
    const articles: NewsArticle[] = (feed.items || [])
      .slice(0, Math.max(limit, 10)) // Fetch more for caching
      .map((item: RSSItem) => ({
        title: item.title || 'No title',
        url: item.link || '#',
        publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
        snippet: item.contentSnippet || item.content || '',
        source: item.creator || extractSourceFromTitle(item.title || ''),
      }));

    // Cache for 1 hour
    await kv.set(cacheKey, articles, { ex: 3600 }).catch((err) => {
      console.error('[news] Failed to cache:', err);
    });

    return NextResponse.json({
      ok: true,
      articles: articles.slice(0, limit),
      cached: false,
    });
  } catch (error) {
    console.error('[news] Error fetching news:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : 'Failed to fetch news',
      articles: [],
    }, { status: 500 });
  }
}

// Extract source from Google News title format: "Title - Source"
function extractSourceFromTitle(title: string): string {
  const parts = title.split(' - ');
  if (parts.length > 1) {
    return parts[parts.length - 1];
  }
  return 'Unknown';
}
