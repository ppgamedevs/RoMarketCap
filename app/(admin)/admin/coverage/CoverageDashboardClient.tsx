"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/button";

type CoverageStats = {
  totalCompanies: number;
  withCUI: number;
  withDomain: number;
  withIndustry: number;
  withCounty: number;
  withFinancials: number;
  withSEAP: number;
  withEUFunds: number;
  withEnrichment: number;
  withForecasts: number;
  coverageScore: number;
  countyCoverage: Array<{ countySlug: string; count: number }>;
  industryCoverage: Array<{ industrySlug: string; count: number }>;
  duplicateRisks: {
    duplicateDomains: Array<{ domain: string; count: number }>;
    duplicateNames: Array<{ normalizedName: string; count: number }>;
  };
  missingData: {
    missingCounty: number;
    missingIndustry: number;
    missingDomain: number;
    missingFinancials: number;
  };
};

export function CoverageDashboardClient() {
  const [stats, setStats] = useState<CoverageStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coverage/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      const data = await res.json();
      setStats(data.stats);
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading...</p>;
  }

  if (!stats) {
    return <p className="text-sm text-muted-foreground">No data available</p>;
  }

  const formatPercent = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Coverage Score */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage Score</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="text-4xl font-bold">{stats.coverageScore}/100</div>
          <p className="text-sm text-muted-foreground mt-2">
            Based on completeness and dedupe health
          </p>
        </CardBody>
      </Card>

      {/* Total Companies */}
      <Card>
        <CardHeader>
          <CardTitle>Total Companies</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="text-2xl font-semibold">{stats.totalCompanies.toLocaleString()}</div>
          <p className="text-sm text-muted-foreground mt-2">
            Excluding demo and merged companies
          </p>
        </CardBody>
      </Card>

      {/* Field Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Field Coverage</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">CUI</div>
              <div className="text-lg">{stats.withCUI.toLocaleString()} ({formatPercent(stats.withCUI, stats.totalCompanies)})</div>
            </div>
            <div>
              <div className="text-sm font-medium">Domain</div>
              <div className="text-lg">{stats.withDomain.toLocaleString()} ({formatPercent(stats.withDomain, stats.totalCompanies)})</div>
            </div>
            <div>
              <div className="text-sm font-medium">Industry</div>
              <div className="text-lg">{stats.withIndustry.toLocaleString()} ({formatPercent(stats.withIndustry, stats.totalCompanies)})</div>
            </div>
            <div>
              <div className="text-sm font-medium">County</div>
              <div className="text-lg">{stats.withCounty.toLocaleString()} ({formatPercent(stats.withCounty, stats.totalCompanies)})</div>
            </div>
            <div>
              <div className="text-sm font-medium">Financials</div>
              <div className="text-lg">{stats.withFinancials.toLocaleString()} ({formatPercent(stats.withFinancials, stats.totalCompanies)})</div>
            </div>
            <div>
              <div className="text-sm font-medium">Enrichment</div>
              <div className="text-lg">{stats.withEnrichment.toLocaleString()} ({formatPercent(stats.withEnrichment, stats.totalCompanies)})</div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Source Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Source Coverage</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">SEAP Contracts</div>
              <div className="text-lg">{stats.withSEAP.toLocaleString()} ({formatPercent(stats.withSEAP, stats.totalCompanies)})</div>
            </div>
            <div>
              <div className="text-sm font-medium">EU Funds</div>
              <div className="text-lg">{stats.withEUFunds.toLocaleString()} ({formatPercent(stats.withEUFunds, stats.totalCompanies)})</div>
            </div>
            <div>
              <div className="text-sm font-medium">Forecasts</div>
              <div className="text-lg">{stats.withForecasts.toLocaleString()} ({formatPercent(stats.withForecasts, stats.totalCompanies)})</div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Duplicate Risks */}
      <Card>
        <CardHeader>
          <CardTitle>Duplicate Risk Indicators</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-sm mb-2">Domains appearing in multiple companies</h4>
              {stats.duplicateRisks.duplicateDomains.length === 0 ? (
                <p className="text-sm text-muted-foreground">No duplicate domains found</p>
              ) : (
                <div className="space-y-1">
                  {stats.duplicateRisks.duplicateDomains.slice(0, 10).map((d, idx) => (
                    <div key={idx} className="text-sm">
                      <strong>{d.domain}</strong>: {d.count} companies
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <h4 className="font-medium text-sm mb-2">Normalized names (without CUI) appearing multiple times</h4>
              {stats.duplicateRisks.duplicateNames.length === 0 ? (
                <p className="text-sm text-muted-foreground">No duplicate names found</p>
              ) : (
                <div className="space-y-1">
                  {stats.duplicateRisks.duplicateNames.slice(0, 10).map((n, idx) => (
                    <div key={idx} className="text-sm">
                      <strong>{n.normalizedName}</strong>: {n.count} companies
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Missing Data */}
      <Card>
        <CardHeader>
          <CardTitle>Top Missing Data Segments</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-medium">Missing County</div>
              <div className="text-lg">{stats.missingData.missingCounty.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Missing Industry</div>
              <div className="text-lg">{stats.missingData.missingIndustry.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Missing Domain</div>
              <div className="text-lg">{stats.missingData.missingDomain.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-sm font-medium">Missing Financials</div>
              <div className="text-lg">{stats.missingData.missingFinancials.toLocaleString()}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* County Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage by County (Top 10)</CardTitle>
        </CardHeader>
        <CardBody>
          {stats.countyCoverage.length === 0 ? (
            <p className="text-sm text-muted-foreground">No county data</p>
          ) : (
            <div className="space-y-2">
              {stats.countyCoverage.slice(0, 10).map((c) => (
                <div key={c.countySlug} className="flex justify-between text-sm">
                  <span>{c.countySlug}</span>
                  <span>{c.count.toLocaleString()} companies</span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Industry Coverage */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage by Industry (Top 10)</CardTitle>
        </CardHeader>
        <CardBody>
          {stats.industryCoverage.length === 0 ? (
            <p className="text-sm text-muted-foreground">No industry data</p>
          ) : (
            <div className="space-y-2">
              {stats.industryCoverage.slice(0, 10).map((i) => (
                <div key={i.industrySlug} className="flex justify-between text-sm">
                  <span>{i.industrySlug}</span>
                  <span>{i.count.toLocaleString()} companies</span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      <div>
        <Button onClick={fetchStats}>Refresh</Button>
      </div>
    </div>
  );
}

