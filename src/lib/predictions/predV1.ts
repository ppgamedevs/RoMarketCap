import { clamp } from "../scoring/normalize";

export type HistoryPoint = {
  recordedAt: Date;
  romcScore: number;
};

export type PredV1Input = {
  romcScore: number;
  romcConfidence: number;
  employees: number | null;
  revenueLatest: number | null;
  profitLatest: number | null;
  industrySlug: string | null;
  countySlug: string | null;
  lastScoredAt: Date | null;
  history: HistoryPoint[];
};

export type Forecast = {
  horizonDays: 30 | 90 | 180;
  forecastScore: number;
  forecastConfidence: number;
  forecastBandLow: number;
  forecastBandHigh: number;
  reasoning: Record<string, unknown>;
  modelVersion: "pred-v1";
};

function daysBetween(a: Date, b: Date): number {
  return Math.max(1, Math.round((a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24)));
}

export function computePredV1(input: PredV1Input): Forecast[] {
  const base = clamp(input.romcScore, 0, 100);

  const historySorted = input.history
    .slice()
    .sort((x, y) => y.recordedAt.getTime() - x.recordedAt.getTime())
    .slice(0, 6);

  const historyCount = historySorted.length;

  let slopePerDay = 0;
  let volatility = 0;
  if (historyCount >= 2) {
    const a = historySorted[0]!;
    const b = historySorted[1]!;
    const d = daysBetween(a.recordedAt, b.recordedAt);
    slopePerDay = (a.romcScore - b.romcScore) / d;
    slopePerDay = clamp(slopePerDay, -0.05, 0.05);

    const deltas: number[] = [];
    for (let i = 0; i + 1 < historySorted.length; i++) {
      const p0 = historySorted[i]!;
      const p1 = historySorted[i + 1]!;
      const dd = daysBetween(p0.recordedAt, p1.recordedAt);
      deltas.push((p0.romcScore - p1.romcScore) / dd);
    }
    const abs = deltas.map((x) => Math.abs(x));
    volatility = abs.length ? abs.reduce((s, x) => s + x, 0) / abs.length : 0;
    volatility = clamp(volatility, 0, 0.08);
  }

  // Fundamentals adjustment, small and bounded.
  let fundamentalsAdj = 0;
  const hasRevenue = input.revenueLatest != null && Number.isFinite(input.revenueLatest);
  const hasProfit = input.profitLatest != null && Number.isFinite(input.profitLatest);
  const hasEmployees = input.employees != null && Number.isFinite(input.employees);

  if (hasRevenue && input.revenueLatest! > 0 && hasProfit && input.profitLatest! > 0) fundamentalsAdj += 4;
  if (hasEmployees && input.employees! >= 10) fundamentalsAdj += 2;
  if (hasProfit && input.profitLatest! < 0) fundamentalsAdj -= 4;
  fundamentalsAdj = clamp(fundamentalsAdj, -8, 8);

  // Confidence.
  let conf = clamp(input.romcConfidence, 0, 100);
  const missingFundamentals = [hasEmployees, hasRevenue, hasProfit].filter(Boolean).length;
  if (historyCount >= 4) conf += 8;
  if (missingFundamentals <= 1) conf -= 10;
  conf = clamp(Math.round(conf), 20, 95);

  const trendWeight = historyCount >= 4 ? 0.9 : historyCount >= 2 ? 0.6 : 0;

  const horizons: Array<30 | 90 | 180> = [30, 90, 180];
  return horizons.map((h) => {
    const trendProjection = slopePerDay * h * trendWeight;
    const raw = base + trendProjection + fundamentalsAdj;
    const forecastScore = clamp(Math.round(raw), 0, 100);

    const uncertainty = (1 - conf / 100) * 20; // 0..16
    const volAdj = volatility * h * 10; // bounded by volatility clamp
    const bandWidth = clamp(Math.round(uncertainty + volAdj), 4, 30);

    const forecastBandLow = clamp(forecastScore - bandWidth, 0, 100);
    const forecastBandHigh = clamp(forecastScore + bandWidth, 0, 100);

    return {
      horizonDays: h,
      forecastScore,
      forecastConfidence: conf,
      forecastBandLow,
      forecastBandHigh,
      modelVersion: "pred-v1",
      reasoning: {
        historyCount,
        slopePerDay,
        trendWeight,
        fundamentalsAdj,
        confidenceInputs: {
          baseRomcConfidence: input.romcConfidence,
          historyBonus: historyCount >= 4 ? 8 : 0,
          missingFundamentalsPenalty: missingFundamentals <= 1 ? 10 : 0,
        },
        volatilityEstimate: volatility,
      },
    };
  });
}


