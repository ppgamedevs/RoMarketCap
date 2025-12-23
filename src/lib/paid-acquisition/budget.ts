import { kv } from "@vercel/kv";

/**
 * Check if paid acquisition is enabled and within budget
 */
export async function checkPaidAcquisitionBudget(amount: number): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const [killSwitchEnabled, dailyBudget, monthlyBudget, dailySpent, monthlySpent] = await Promise.all([
    kv.get<boolean>("paid-acquisition:kill-switch"),
    kv.get<number>("paid-acquisition:budget:daily"),
    kv.get<number>("paid-acquisition:budget:monthly"),
    kv.get<number>("paid-acquisition:spent:daily"),
    kv.get<number>("paid-acquisition:spent:monthly"),
  ]);

  // Kill switch check
  if (killSwitchEnabled) {
    return { allowed: false, reason: "Kill switch enabled" };
  }

  // Daily budget check
  const dailyBudgetValue = dailyBudget ?? 0;
  const dailySpentValue = dailySpent ?? 0;
  if (dailyBudgetValue > 0 && dailySpentValue + amount > dailyBudgetValue) {
    return { allowed: false, reason: "Daily budget exceeded" };
  }

  // Monthly budget check
  const monthlyBudgetValue = monthlyBudget ?? 0;
  const monthlySpentValue = monthlySpent ?? 0;
  if (monthlyBudgetValue > 0 && monthlySpentValue + amount > monthlyBudgetValue) {
    return { allowed: false, reason: "Monthly budget exceeded" };
  }

  return { allowed: true };
}

/**
 * Record spending for paid acquisition
 */
export async function recordPaidAcquisitionSpending(amount: number): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const month = new Date().toISOString().slice(0, 7);

  await Promise.all([
    kv.incrby(`paid-acquisition:spent:daily:${today}`, amount),
    kv.incrby(`paid-acquisition:spent:monthly:${month}`, amount),
    kv.incrby("paid-acquisition:spent:total", amount),
  ]);

  // Set expiration for daily key (2 days)
  await kv.expire(`paid-acquisition:spent:daily:${today}`, 60 * 60 * 24 * 2);
}

