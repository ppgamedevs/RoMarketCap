/**
 * PROMPT 58: Financials Card Component
 * 
 * Displays company financial data from ANAF sync
 */

import { Card, CardHeader, CardTitle, CardBody } from "@/components/ui/Card";
import { CompanyFinancialDataSource } from "@prisma/client";

type FinancialsCardProps = {
  lang: "ro" | "en";
  revenueLatest: number | null;
  profitLatest: number | null;
  employees: number | null;
  currency: string;
  lastFinancialSyncAt: Date | null;
  financialSource: unknown; // JSON field
  financialSnapshots?: Array<{
    fiscalYear: number;
    revenue: number | null;
    profit: number | null;
    employees: number | null;
    currency: string;
    dataSource: CompanyFinancialDataSource;
    fetchedAt: Date;
  }>;
};

function formatMoney(n: number | null, currency: string, locale: string): string {
  if (n == null) return "N/A";
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

export function FinancialsCard({
  lang,
  revenueLatest,
  profitLatest,
  employees,
  currency,
  lastFinancialSyncAt,
  financialSource,
  financialSnapshots,
}: FinancialsCardProps) {
  const hasData = revenueLatest !== null || profitLatest !== null || employees !== null;
  const source = financialSource && typeof financialSource === "object" && "source" in financialSource
    ? (financialSource as { source?: string }).source
    : null;

  // Get latest snapshot if available
  const latestSnapshot = financialSnapshots
    ?.filter((s) => s.dataSource === CompanyFinancialDataSource.ANAF_WS)
    .sort((a, b) => b.fiscalYear - a.fiscalYear)[0];

  const displayYear = latestSnapshot?.fiscalYear || 
    (financialSource && typeof financialSource === "object" && "year" in financialSource
      ? (financialSource as { year?: number }).year
      : null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{lang === "ro" ? "Situație Financiară" : "Financials"}</CardTitle>
      </CardHeader>
      <CardBody>
        {!hasData ? (
          <div className="text-sm text-muted-foreground">
            {lang === "ro" 
              ? "Date financiare nu au fost sincronizate încă." 
              : "Financial data has not been synced yet."}
            {lastFinancialSyncAt === null && (
              <p className="mt-2 text-xs italic">
                {lang === "ro"
                  ? "Datele vor fi actualizate automat din surse publice."
                  : "Data will be updated automatically from public sources."}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayYear && (
              <div className="text-xs text-muted-foreground">
                {lang === "ro" ? "An" : "Year"}: {displayYear}
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground">
                  {lang === "ro" ? "Venituri" : "Revenue"}
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {formatMoney(revenueLatest, currency, lang === "ro" ? "ro-RO" : "en-GB")}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  {lang === "ro" ? "Profit" : "Profit"}
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {formatMoney(profitLatest, currency, lang === "ro" ? "ro-RO" : "en-GB")}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">
                  {lang === "ro" ? "Angajați" : "Employees"}
                </div>
                <div className="mt-1 text-lg font-semibold">
                  {employees !== null ? employees.toLocaleString(lang === "ro" ? "ro-RO" : "en-GB") : "N/A"}
                </div>
              </div>
            </div>
            <div className="border-t pt-2 text-xs text-muted-foreground">
              {lang === "ro" ? "Sursă" : "Source"}: {source === "ANAF_WS" 
                ? (lang === "ro" ? "Situații financiare publice (ANAF)" : "Public financial statements (ANAF)")
                : (lang === "ro" ? "Date publice" : "Public data")}
              {lastFinancialSyncAt && (
                <>
                  {" • "}
                  {lang === "ro" ? "Actualizat" : "Updated"}:{" "}
                  {lastFinancialSyncAt.toLocaleDateString(lang === "ro" ? "ro-RO" : "en-GB")}
                </>
              )}
            </div>
          </div>
        )}
      </CardBody>
    </Card>
  );
}

