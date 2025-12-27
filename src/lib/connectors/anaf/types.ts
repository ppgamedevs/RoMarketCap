/**
 * PROMPT 58: ANAF Financial Sync Types
 */

/**
 * Normalized financial data from ANAF web service
 */
export type ANAFFinancialData = {
  year: number;
  revenue: number | null;
  profit: number | null;
  employees: number | null;
  currency: string;
  confidence: number; // 0-100
  rawResponse?: unknown; // Original response for audit
};

/**
 * Financial sync result
 */
export type FinancialSyncResult = {
  success: boolean;
  data: ANAFFinancialData[];
  warnings: string[];
  error?: string;
  checksum?: string; // Stable hash for idempotency
};

/**
 * Options for syncing financials
 */
export type SyncFinancialsOptions = {
  cui: string;
  dryRun?: boolean;
  years?: number[]; // Specific years to fetch, or all available
  preferLatest?: boolean; // If true, only fetch latest year
};

