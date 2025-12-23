import type { ScoreStabilityProfile } from "@prisma/client";

/**
 * Calculate score volatility based on historical deltas.
 * Returns LOW, MEDIUM, or HIGH volatility profile.
 */
export function calculateStabilityProfile(deltas: number[]): ScoreStabilityProfile {
  if (deltas.length === 0) return "MEDIUM";

  const absDeltas = deltas.map(Math.abs);
  const avgDelta = absDeltas.reduce((a, b) => a + b, 0) / absDeltas.length;
  const maxDelta = Math.max(...absDeltas);

  // LOW: avg < 2, max < 5
  // MEDIUM: avg < 5, max < 10
  // HIGH: otherwise
  if (avgDelta < 2 && maxDelta < 5) return "LOW";
  if (avgDelta < 5 && maxDelta < 10) return "MEDIUM";
  return "HIGH";
}

/**
 * Apply EWMA (Exponentially Weighted Moving Average) smoothing to a score.
 * @param currentScore Current raw score
 * @param previousScore Previous smoothed score (or raw if first time)
 * @param alpha Smoothing factor (0-1). Lower = more smoothing. Default 0.3.
 */
export function smoothScoreEwma(currentScore: number, previousScore: number | null, alpha = 0.3): number {
  if (previousScore == null) return currentScore;
  return Math.round(alpha * currentScore + (1 - alpha) * previousScore);
}

/**
 * Apply capped delta smoothing: limit daily movement to maxDeltaPercent.
 * @param currentScore Current raw score
 * @param previousScore Previous score
 * @param maxDeltaPercent Maximum allowed daily change (e.g., 7 for 7%)
 * @returns Smoothed score respecting the cap
 */
export function smoothScoreCapped(currentScore: number, previousScore: number | null, maxDeltaPercent = 7): number {
  if (previousScore == null) return currentScore;

  const maxDelta = Math.round((previousScore * maxDeltaPercent) / 100);
  const delta = currentScore - previousScore;

  if (Math.abs(delta) <= maxDelta) {
    return currentScore;
  }

  // Cap the movement
  return previousScore + (delta > 0 ? maxDelta : -maxDelta);
}

/**
 * Calculate daily delta between scores.
 */
export function calculateScoreDelta(currentScore: number | null, previousScore: number | null): number | null {
  if (currentScore == null || previousScore == null) return null;
  return currentScore - previousScore;
}

/**
 * Calculate percentage change.
 */
export function calculateScoreDeltaPercent(currentScore: number | null, previousScore: number | null): number | null {
  if (currentScore == null || previousScore == null || previousScore === 0) return null;
  return ((currentScore - previousScore) / previousScore) * 100;
}

