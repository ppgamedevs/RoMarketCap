"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import type { MarketingMetrics } from "@/src/lib/marketing/metrics";

type MetricsResponse = {
  ok: boolean;
  metrics?: MarketingMetrics;
  error?: string;
};

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

function formatPercent(num: number): string {
  return `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;
}

function MetricCard({
  title,
  value,
  delta,
  deltaPercent,
  subtitle,
}: {
  title: string;
  value: number | string;
  delta?: number;
  deltaPercent?: number;
  subtitle?: string;
}) {
  const isPositive = delta != null && delta > 0;
  const isNegative = delta != null && delta < 0;

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-medium">{title}</h3>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardBody>
        <div className="text-2xl font-semibold">{typeof value === "number" ? formatNumber(value) : value}</div>
        {delta != null && deltaPercent != null && (
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={isPositive ? "success" : isNegative ? "danger" : "neutral"}>
              {formatPercent(deltaPercent)}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {delta >= 0 ? "+" : ""}
              {formatNumber(delta)} WoW
            </span>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

export function MarketingDashboardClient({ metricsUrl }: { metricsUrl: string }) {
  const [metrics, setMetrics] = useState<MarketingMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const res = await fetch(metricsUrl, { cache: "no-store" });
        const data: MetricsResponse = await res.json();
        if (data.ok && data.metrics) {
          setMetrics(data.metrics);
        } else {
          setError(data.error ?? "Failed to fetch metrics");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
    // Refresh every 60 seconds
    const interval = setInterval(fetchMetrics, 60000);
    return () => clearInterval(interval);
  }, [metricsUrl]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardBody>
              <Skeleton className="h-8 w-16" />
            </CardBody>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
        {error ?? "Failed to load metrics"}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Traffic Metrics */}
      <div>
        <h3 className="mb-4 text-sm font-semibold">Traffic</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <MetricCard
            title="Organic Traffic"
            value={metrics.organicTraffic.current}
            delta={metrics.organicTraffic.delta}
            deltaPercent={metrics.organicTraffic.deltaPercent}
            subtitle="7-day period"
          />
          <MetricCard
            title="Brand Search Traffic"
            value={metrics.brandSearchTraffic.current}
            delta={metrics.brandSearchTraffic.delta}
            deltaPercent={metrics.brandSearchTraffic.deltaPercent}
            subtitle="Searches for 'romarketcap'"
          />
        </div>
      </div>

      {/* Conversion Metrics */}
      <div>
        <h3 className="mb-4 text-sm font-semibold">Conversions</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Claimed Companies"
            value={metrics.claimedCompanies.total}
            delta={metrics.claimedCompanies.delta}
            deltaPercent={metrics.claimedCompanies.deltaPercent}
            subtitle={`${metrics.claimedCompanies.thisWeek} this week`}
          />
          <MetricCard
            title="Newsletter Subscribers"
            value={metrics.newsletterSubscribers.total}
            delta={metrics.newsletterSubscribers.delta}
            deltaPercent={metrics.newsletterSubscribers.deltaPercent}
            subtitle={`${metrics.newsletterSubscribers.active} active`}
          />
          <MetricCard
            title="Premium Users"
            value={metrics.premiumUsers.total}
            delta={metrics.premiumUsers.delta}
            deltaPercent={metrics.premiumUsers.deltaPercent}
            subtitle={`${metrics.premiumUsers.thisWeek} this week`}
          />
          <MetricCard
            title="API Keys"
            value={metrics.apiKeys.total}
            delta={metrics.apiKeys.delta}
            deltaPercent={metrics.apiKeys.deltaPercent}
            subtitle={`${metrics.apiKeys.active} active`}
          />
          <MetricCard
            title="Partner Leads"
            value={metrics.partnerLeads.total}
            delta={metrics.partnerLeads.delta}
            deltaPercent={metrics.partnerLeads.deltaPercent}
            subtitle={`${metrics.partnerLeads.new} new`}
          />
          <MetricCard
            title="Watchlists"
            value={metrics.watchlists.total}
            delta={metrics.watchlists.delta}
            deltaPercent={metrics.watchlists.deltaPercent}
            subtitle={`${metrics.watchlists.thisWeek} this week`}
          />
        </div>
      </div>

      {/* Event Tracking Status */}
      <div className="mt-8">
        <h3 className="mb-4 text-sm font-semibold">Event Tracking Status</h3>
        <Card>
          <CardBody>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Newsletter Subscribe</span>
                <Badge variant="success">Tracked</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Pricing CTA</span>
                <Badge variant="success">Tracked</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Checkout Start</span>
                <Badge variant="success">Tracked</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Checkout Success</span>
                <Badge variant="success">Tracked</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Premium Click</span>
                <Badge variant="success">Tracked</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Partner Lead Submit</span>
                <Badge variant="success">Tracked</Badge>
              </div>
              <div className="mt-4 text-xs text-muted-foreground">
                See <code>docs/MARKETING_METRICS.md</code> for full tracking details
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

