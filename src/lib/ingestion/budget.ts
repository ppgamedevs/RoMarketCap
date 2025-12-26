/**
 * PROMPT 55: Budget Management
 * 
 * Tracks and enforces ingestion budgets (time and records)
 */

export type IngestionBudget = {
  recordsRemaining: number;
  timeRemainingMs: number;
  startTime: number;
};

/**
 * Create a new budget
 */
export function createBudget(recordsLimit: number, timeLimitMs: number): IngestionBudget {
  return {
    recordsRemaining: recordsLimit,
    timeRemainingMs: timeLimitMs,
    startTime: Date.now(),
  };
}

/**
 * Check if budget allows processing one more record
 */
export function canProcessRecord(budget: IngestionBudget): boolean {
  const elapsed = Date.now() - budget.startTime;
  return budget.recordsRemaining > 0 && elapsed < budget.timeRemainingMs;
}

/**
 * Consume budget for one record
 */
export function consumeRecord(budget: IngestionBudget): boolean {
  if (!canProcessRecord(budget)) {
    return false;
  }
  budget.recordsRemaining--;
  return true;
}

/**
 * Get remaining budget info
 */
export function getBudgetInfo(budget: IngestionBudget): {
  recordsRemaining: number;
  timeRemainingMs: number;
  elapsedMs: number;
} {
  const elapsed = Date.now() - budget.startTime;
  return {
    recordsRemaining: budget.recordsRemaining,
    timeRemainingMs: Math.max(0, budget.timeRemainingMs - elapsed),
    elapsedMs: elapsed,
  };
}

