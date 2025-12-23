import { clamp, normalizeMinMax } from "./normalize";

export type RomcV0Inputs = {
  revenue: number | null;
  profit: number | null;
  employees: number | null;
  assets: number | null;
  liabilities: number | null;
  signals: Array<{ type: string; observedAt: Date }>;
  now: Date;
};

export type RomcV0Output = {
  romcScore: number;
  growthScore: number;
  riskScore: number;
  liquidityScore: number;
  confidence: number;
  explanationRo: string;
  explanationEn: string;
  components: Record<string, unknown>;
};

function safeLogScore(x: number, max: number): number {
  const v = clamp(x, 0, max);
  return Math.log10(v + 1) / Math.log10(max + 1);
}

function daysBetween(a: Date, b: Date): number {
  return (a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

export function romcV0(inputs: RomcV0Inputs): RomcV0Output {
  const revenue = inputs.revenue;
  const profit = inputs.profit;
  const employees = inputs.employees;
  const assets = inputs.assets;
  const liabilities = inputs.liabilities;

  // Revenue bucket: +0..+20 (log-scale)
  const revenueBoost = revenue == null ? 0 : 20 * safeLogScore(revenue, 200_000_000);

  // Profit margin: -10..+10
  let margin = 0;
  if (revenue != null && revenue > 0 && profit != null) margin = profit / revenue;
  const marginNorm = normalizeMinMax(margin, -0.2, 0.3); // map into 0..1
  const marginBoost = -10 + 20 * marginNorm;

  // Employees: +0..+10
  const employeesBoost =
    employees == null ? 0 : 10 * normalizeMinMax(employees, 0, 2000);

  // Signals: +0..+10 (recent signals weighted)
  let signalsBoost = 0;
  for (const s of inputs.signals) {
    const ageDays = daysBetween(inputs.now, s.observedAt);
    if (ageDays < 0) continue;
    if (ageDays <= 7) signalsBoost += 2;
    else if (ageDays <= 30) signalsBoost += 1;
    else if (ageDays <= 90) signalsBoost += 0.5;
  }
  signalsBoost = clamp(signalsBoost, 0, 10);

  // Risk penalties affect riskScore (higher = worse) and can cap romc score.
  let riskPenalty = 0;
  if (profit != null && profit < 0) riskPenalty += 10;
  if (assets != null && liabilities != null && liabilities > assets) riskPenalty += 15;
  riskPenalty = clamp(riskPenalty, 0, 25);

  // Base ROMC score
  let romcScore = 50 + revenueBoost + marginBoost + employeesBoost + signalsBoost;
  romcScore = clamp(Math.round(romcScore - riskPenalty * 0.4), 0, 100);

  const growthScore = clamp(Math.round(50 + signalsBoost * 3 + marginBoost * 0.5), 0, 100);
  const riskScore = clamp(Math.round(20 + riskPenalty + (profit != null && profit < 0 ? 10 : 0)), 0, 100);
  const liquidityScore = clamp(Math.round(50 + signalsBoost * 2 + employeesBoost), 0, 100);

  // Confidence: min 30, max 90 based on presence of metrics and signals
  const present = [revenue != null, profit != null, employees != null, assets != null, liabilities != null].filter(Boolean)
    .length;
  const sigCount = inputs.signals.length;
  let confidence = 30 + present * 10 + Math.min(sigCount, 10) * 2;
  confidence = clamp(Math.round(confidence), 30, 90);

  const disclaimerRo =
    "Estimare orientativă. Nu reprezintă consultanță financiară. RoMarketCap nu intermediază tranzacții.";
  const disclaimerEn =
    "Indicative estimate. Not financial advice. RoMarketCap does not broker transactions.";

  const explanationRo = [
    `- Scor bază: 50`,
    `- Venituri: ${revenue == null ? "lipsă" : "prezente"}`,
    `- Profit: ${profit == null ? "lipsă" : profit < 0 ? "negativ" : "pozitiv"}`,
    `- Semnale recente: ${sigCount}`,
    `- Încredere: ${confidence}/100`,
    `- ${disclaimerRo}`,
  ].join("\n");

  const explanationEn = [
    `- Base score: 50`,
    `- Revenue: ${revenue == null ? "missing" : "present"}`,
    `- Profit: ${profit == null ? "missing" : profit < 0 ? "negative" : "positive"}`,
    `- Recent signals: ${sigCount}`,
    `- Confidence: ${confidence}/100`,
    `- ${disclaimerEn}`,
  ].join("\n");

  const components = {
    version: "romc_v0",
    inputs: { revenue, profit, employees, assets, liabilities, signalsCount: sigCount },
    boosts: { revenueBoost, marginBoost, employeesBoost, signalsBoost },
    riskPenalty,
    outputs: { romcScore, growthScore, riskScore, liquidityScore, confidence },
  };

  return { romcScore, growthScore, riskScore, liquidityScore, confidence, explanationRo, explanationEn, components };
}


