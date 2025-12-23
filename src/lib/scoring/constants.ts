export const SCORING_CONSTANTS_V0 = {
  employeesCount: { min: 0, max: 2000 },
  revenueLastYear: { min: 0, max: 200_000_000 },
  profitLastYear: { min: -10_000_000, max: 50_000_000 },
  websiteTrafficMonthly: { min: 0, max: 5_000_000 },
  mentions30d: { min: 0, max: 2000 },
  linkedinGrowth90d: { min: -0.2, max: 1.5 },
  seapContractsValue: { min: 0, max: 200_000_000 },
  seapContractsCount: { min: 0, max: 2000 },
} as const;


