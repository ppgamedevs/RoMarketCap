/**
 * PROMPT 55: Tests for budget management
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createBudget, canProcessRecord, consumeRecord, getBudgetInfo } from "./budget";

describe("budget", () => {
  let budget: ReturnType<typeof createBudget>;

  beforeEach(() => {
    budget = createBudget(10, 5000); // 10 records, 5 seconds
  });

  it("should create budget with correct limits", () => {
    expect(budget.recordsRemaining).toBe(10);
    expect(budget.timeRemainingMs).toBe(5000);
  });

  it("should allow processing when budget available", () => {
    expect(canProcessRecord(budget)).toBe(true);
  });

  it("should consume records", () => {
    expect(consumeRecord(budget)).toBe(true);
    expect(budget.recordsRemaining).toBe(9);
  });

  it("should reject when records exhausted", () => {
    budget.recordsRemaining = 0;
    expect(canProcessRecord(budget)).toBe(false);
    expect(consumeRecord(budget)).toBe(false);
  });

  it("should get budget info", () => {
    const info = getBudgetInfo(budget);
    expect(info.recordsRemaining).toBe(10);
    expect(info.timeRemainingMs).toBeGreaterThan(0);
    expect(info.elapsedMs).toBeGreaterThanOrEqual(0);
  });
});

