/**
 * PROMPT 62: Market Table Component
 * 
 * Displays ranked companies in a CoinMarketCap-style table
 */

"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Sparkline } from "./Sparkline";
import { Button } from "@/components/ui/button";

type MarketRow = {
  rank: number;
  companyId: string;
  slug: string;
  name: string;
  legalName: string | null;
  cui: string | null;
  logoUrl: string | null;
  romcScore: number | null;
  romcAiScore: number | null;
  dataConfidence: number | null;
  integrityScore: number | null;
  valuationRangeLow: number | null;
  valuationRangeHigh: number | null;
  marketCap: number | null;
  isListed: boolean;
  stockSymbol: string | null;
  industrySlug: string | null;
  countySlug: string | null;
  lastScoredAt: Date | null;
  sparklineData: Array<{ date: string; score: number }>;
  rankDelta: number | null;
};

type MarketTableProps = {
  lang: "ro" | "en";
  page: number;
  pageSize: number;
  search?: string;
  industry?: string;
  county?: string;
  confidence?: "high" | "medium" | "low";
  integrity?: boolean;
  verified?: boolean;
  fresh?: boolean;
  sort: "romcAiScore" | "romcScore" | "marketCap" | "confidence";
};

function isPlaceholderDisplayName(name: string): boolean {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return true;
  if (trimmed.startsWith("Companie CUI:")) return true;
  if (trimmed.startsWith("Company CUI:")) return true;
  if (/^Company \d+$/.test(trimmed)) return true;
  return false;
}

function formatCompanyDisplayName(lang: "ro" | "en", name: string, cui: string | null): string {
  if (!isPlaceholderDisplayName(name)) return name;
  const cuiText = cui?.trim() ? cui.trim() : "";
  if (!cuiText) return lang === "ro" ? "Companie" : "Company";
  return lang === "ro" ? `Companie CUI: ${cuiText}` : `Company CUI: ${cuiText}`;
}

export function MarketTable(props: MarketTableProps) {
  return (
    <Suspense fallback={<MarketTableSkeleton />}>
      <MarketTableInner {...props} />
    </Suspense>
  );
}

function MarketTableInner({
  lang,
  page,
  pageSize,
  search,
  industry,
  county,
  confidence,
  integrity,
  verified,
  fresh,
  sort,
}: MarketTableProps) {
  const [data, setData] = useState<{ rows: MarketRow[]; total: number; isPremium: boolean; freeLimit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
        if (search) params.set("search", search);
        if (industry) params.set("industry", industry);
        if (county) params.set("county", county);
        if (confidence) params.set("confidence", confidence);
        if (integrity) params.set("integrity", "true");
        if (verified) params.set("verified", "true");
        if (fresh) params.set("fresh", "true");
        if (sort) params.set("sort", sort);

        const res = await fetch(`/api/market?${params.toString()}`);
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.statusText}`);
        }
        const json = await res.json();
        if (!json.ok) {
          throw new Error(json.error || "Unknown error");
        }
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [page, pageSize, search, industry, county, confidence, integrity, verified, fresh, sort]);

  if (loading) {
    return <MarketTableSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
        {lang === "ro" ? "Eroare la încărcarea datelor:" : "Error loading data:"} {error}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
        {lang === "ro" ? "Nu s-au găsit companii." : "No companies found."}
      </div>
    );
  }

  const { rows, total, isPremium, freeLimit } = data;
  const totalPages = Math.ceil(total / pageSize);
  const isFreeLimited = !isPremium && rows.length >= freeLimit;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {lang === "ro" ? "Total:" : "Total:"} {total.toLocaleString()}
          {isFreeLimited && (
            <span className="ml-2">
              ({lang === "ro" ? "afișate primele" : "showing first"} {freeLimit})
            </span>
          )}
        </span>
        {!isPremium && (
          <Link href="/pricing" className="text-primary hover:underline">
            {lang === "ro" ? "Upgrade pentru acces complet" : "Upgrade for full access"}
          </Link>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table stickyHeader>
          <THead>
            <TR>
              <TH className="w-16">#</TH>
              <TH>{lang === "ro" ? "Companie" : "Company"}</TH>
              <TH className="w-24">{lang === "ro" ? "Scor ROMC" : "ROMC Score"}</TH>
              <TH className="w-32">{lang === "ro" ? "Tendință 7d" : "7d Trend"}</TH>
              <TH className="w-24">{lang === "ro" ? "ROMC AI" : "ROMC AI"}</TH>
              <TH className="w-28">{lang === "ro" ? "Confidență" : "Confidence"}</TH>
              <TH className="w-36">{lang === "ro" ? "Market Cap" : "Market Cap"}</TH>
              <TH className="w-20">{lang === "ro" ? "24h" : "24h"}</TH>
              <TH className="w-24">{lang === "ro" ? "Acțiuni" : "Actions"}</TH>
            </TR>
          </THead>
          <TBody>
            {rows.map((row, idx) => {
              const isBlurred = !isPremium && idx >= freeLimit;
              const displayName = formatCompanyDisplayName(lang, row.name, row.cui);
              return (
                <TR key={row.companyId} className={isBlurred ? "opacity-50 blur-sm" : ""}>
                  <TD className="font-medium">{row.rank}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      {row.logoUrl ? (
                        <>
                          <img 
                            src={row.logoUrl} 
                            alt={displayName}
                            className="h-8 w-8 rounded object-contain bg-white"
                            onError={(e) => {
                              // Fallback to initial on error
                              const target = e.currentTarget;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling;
                              if (fallback) {
                                fallback.classList.remove('hidden');
                              }
                            }}
                          />
                          <div className="hidden flex h-8 w-8 items-center justify-center rounded bg-muted text-xs font-semibold">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                        </>
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-xs font-semibold">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-medium">{displayName}</div>
                        <div className="text-xs text-muted-foreground">{row.cui || "—"}</div>
                      </div>
                    </div>
                  </TD>
                  <TD>
                    {row.romcScore !== null ? (
                      <Badge variant={row.romcScore >= 70 ? "success" : row.romcScore >= 50 ? "warning" : "danger"}>
                        {row.romcScore}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TD>
                  <TD>
                    <Sparkline data={row.sparklineData} />
                  </TD>
                  <TD>
                    {row.romcAiScore !== null ? (
                      <span className="text-sm font-medium">{row.romcAiScore}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TD>
                  <TD>
                    {row.dataConfidence !== null ? (
                      <div>
                        <div className="text-sm font-medium">{row.dataConfidence}%</div>
                        <div className="text-xs text-muted-foreground">
                          {row.dataConfidence >= 70 ? (lang === "ro" ? "Ridicată" : "High") : row.dataConfidence >= 50 ? (lang === "ro" ? "Medie" : "Medium") : (lang === "ro" ? "Scăzută" : "Low")}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TD>
                  <TD>
                    {row.marketCap !== null ? (
                      <div>
                        <div className="text-sm font-medium">
                          {new Intl.NumberFormat(lang === "ro" ? "ro-RO" : "en-US", {
                            style: "currency",
                            currency: "RON",
                            notation: "compact",
                            maximumFractionDigits: 1,
                          }).format(row.marketCap)}
                        </div>
                        {row.isListed && row.stockSymbol && (
                          <div className="text-xs text-primary">{row.stockSymbol}</div>
                        )}
                      </div>
                    ) : row.valuationRangeLow !== null && row.valuationRangeHigh !== null ? (
                      <div className="text-sm">
                        <div className="font-medium">
                          {formatCurrency(row.valuationRangeLow)} - {formatCurrency(row.valuationRangeHigh)}
                        </div>
                        <div className="text-xs text-muted-foreground" title={lang === "ro" ? "Estimare" : "Estimate"}>
                          {lang === "ro" ? "est." : "est."}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TD>
                  <TD>
                    {row.rankDelta !== null ? (
                      <div className={`text-sm font-medium ${row.rankDelta > 0 ? "text-green-600" : row.rankDelta < 0 ? "text-red-600" : ""}`}>
                        {row.rankDelta > 0 ? "▲" : row.rankDelta < 0 ? "▼" : "—"} {Math.abs(row.rankDelta)}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TD>
                  <TD>
                    <div className="flex gap-1">
                      <Link href={`/company/${row.slug}`}>
                        <Button variant="outline" size="sm">
                          {lang === "ro" ? "Vezi" : "View"}
                        </Button>
                      </Link>
                    </div>
                  </TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set("page", String(page - 1));
              window.location.search = params.toString();
            }}
          >
            {lang === "ro" ? "Anterior" : "Previous"}
          </Button>
          <span className="text-sm text-muted-foreground">
            {lang === "ro" ? "Pagina" : "Page"} {page} {lang === "ro" ? "din" : "of"} {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => {
              const params = new URLSearchParams(window.location.search);
              params.set("page", String(page + 1));
              window.location.search = params.toString();
            }}
          >
            {lang === "ro" ? "Următor" : "Next"}
          </Button>
        </div>
      )}
    </div>
  );
}

function MarketTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="overflow-x-auto">
        <Table>
          <THead>
            <TR>
              {Array.from({ length: 9 }).map((_, i) => (
                <TH key={i}>
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {Array.from({ length: 10 }).map((_, i) => (
              <TR key={i}>
                {Array.from({ length: 9 }).map((_, j) => (
                  <TD key={j}>
                    <div className="h-6 w-20 animate-pulse rounded bg-muted" />
                  </TD>
                ))}
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `€${(value / 1_000_000_000).toFixed(1)}B`;
  }
  if (value >= 1_000_000) {
    return `€${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `€${(value / 1_000).toFixed(1)}K`;
  }
  return `€${value.toFixed(0)}`;
}

