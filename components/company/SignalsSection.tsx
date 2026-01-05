"use client";

import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus, Globe, Newspaper, Users } from "lucide-react";
import type { Lang } from "@/src/lib/i18n";
import { t } from "@/src/lib/i18n/shared";

type SignalsSectionProps = {
  companyId: string;
  companyCui: string | null;
  companyName: string;
  website: string | null;
  financialSnapshots: Array<{
    fiscalYear: number;
    employees: number | null;
  }>;
  lang: Lang;
};

type SignalData = {
  hiringVelocity: {
    value: number | null; // percentage change
    direction: "up" | "down" | "neutral";
    label: string;
  };
  webTraffic: {
    value: string;
    label: string;
  };
  newsMentions: {
    count: number;
    label: string;
  };
};

export function SignalsSection({
  companyId,
  companyCui,
  companyName,
  website,
  financialSnapshots,
  lang,
}: SignalsSectionProps) {
  const [newsCount, setNewsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate hiring velocity from employee count changes
  const calculateHiringVelocity = (): SignalData["hiringVelocity"] => {
    if (!financialSnapshots || financialSnapshots.length < 2) {
      return {
        value: null,
        direction: "neutral",
        label: lang === "ro" ? "Date insuficiente" : "Insufficient data",
      };
    }

    // Get last 2 years with employee data
    const sorted = financialSnapshots
      .filter((s) => s.employees != null)
      .sort((a, b) => b.fiscalYear - a.fiscalYear)
      .slice(0, 2);

    if (sorted.length < 2) {
      return {
        value: null,
        direction: "neutral",
        label: lang === "ro" ? "Date insuficiente" : "Insufficient data",
      };
    }

    const [latest, previous] = sorted;
    const change = ((latest.employees! - previous.employees!) / previous.employees!) * 100;

    if (Math.abs(change) < 1) {
      return {
        value: 0,
        direction: "neutral",
        label: lang === "ro" ? "Stabil" : "Stable",
      };
    }

    return {
      value: Math.round(change),
      direction: change > 0 ? "up" : "down",
      label:
        lang === "ro"
          ? `${change > 0 ? "+" : ""}${Math.round(change)}% (ultimele 12 luni)`
          : `${change > 0 ? "+" : ""}${Math.round(change)}% (last 12 months)`,
    };
  };

  // Fetch news count
  useEffect(() => {
    if (!companyCui) {
      setLoading(false);
      return;
    }

    const fetchNews = async () => {
      try {
        const params = new URLSearchParams({
          name: companyName,
          lang,
          limit: "100", // Get more to count
        });

        const response = await fetch(`/api/company/${companyCui}/news?${params}`);
        const data = await response.json();

        if (data.ok && Array.isArray(data.articles)) {
          // Count articles from last 30 days
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const recentArticles = data.articles.filter((article: { publishedAt: string }) => {
            const published = new Date(article.publishedAt);
            return published >= thirtyDaysAgo;
          });
          setNewsCount(recentArticles.length);
        }
      } catch (err) {
        console.error("[SignalsSection] Error fetching news:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [companyCui, companyName, lang]);

  const hiringVelocity = calculateHiringVelocity();
  const webTraffic = website
    ? {
        value: lang === "ro" ? "Activ" : "Active",
        label: lang === "ro" ? "Website verificat" : "Verified website",
      }
    : {
        value: lang === "ro" ? "N/A" : "N/A",
        label: lang === "ro" ? "Nu urmărim direct" : "Not tracked directly",
      };

  const newsMentions =
    newsCount !== null
      ? {
          count: newsCount,
          label:
            lang === "ro"
              ? newsCount === 0
                ? "Fără mențiuni recente"
                : `${newsCount} în ultimele 30 zile`
              : newsCount === 0
                ? "No recent mentions"
                : `${newsCount} in last 30 days`,
        }
      : {
          count: 0,
            label: loading
            ? t(lang, "loading")
            : lang === "ro"
              ? "Fără mențiuni recente"
              : "No recent mentions",
        };

  const signals: Array<{
    icon: typeof TrendingUp;
    title: string;
    value: string;
    direction?: "up" | "down" | "neutral";
    color: string;
  }> = [
    {
      icon: Users,
      title: lang === "ro" ? "Crescere angajări" : "Hiring velocity",
      value: hiringVelocity.label,
      direction: hiringVelocity.direction,
      color:
        hiringVelocity.direction === "up"
          ? "text-green-600 bg-green-50 border-green-200"
          : hiringVelocity.direction === "down"
            ? "text-red-600 bg-red-50 border-red-200"
            : "text-gray-600 bg-gray-50 border-gray-200",
    },
    {
      icon: Globe,
      title: lang === "ro" ? "Trafic web" : "Web traffic",
      value: webTraffic.value,
      color: website ? "text-blue-600 bg-blue-50 border-blue-200" : "text-gray-600 bg-gray-50 border-gray-200",
    },
    {
      icon: Newspaper,
      title: lang === "ro" ? "Mențiuni știri" : "News mentions",
      value: newsMentions.label,
      color:
        newsMentions.count > 0
          ? "text-purple-600 bg-purple-50 border-purple-200"
          : "text-gray-600 bg-gray-50 border-gray-200",
    },
  ];

  return (
    <div className="rounded-xl border bg-card p-6 text-card-foreground">
      <h2 className="text-sm font-medium">{lang === "ro" ? "Semnale" : "Signals"}</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {signals.map((signal, idx) => {
          const Icon = signal.icon;
          return (
            <div
              key={idx}
              className={`rounded-lg border p-3 transition-all hover:shadow-sm ${signal.color}`}
            >
              <div className="flex items-start gap-2">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${signal.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground">{signal.title}</p>
                  <div className="mt-1 flex items-center gap-1">
                    {signal.direction === "up" && <TrendingUp className="h-3 w-3" />}
                    {signal.direction === "down" && <TrendingDown className="h-3 w-3" />}
                    {signal.direction === "neutral" && <Minus className="h-3 w-3" />}
                    <p className="text-sm font-semibold">{signal.value}</p>
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
