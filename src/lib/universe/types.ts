/**
 * PROMPT 57: Universe source types
 */

export type UniverseSource = "SEAP" | "EU_FUNDS" | "ANAF" | "USER" | "THIRD_PARTY";

export type SkeletonCompanyInput = {
  cui: string;
  legalName: string;
  countySlug?: string;
  caenCode?: string;
  foundedAt?: Date;
  universeSource: UniverseSource;
  universeConfidence: number; // 0-100
  universeVerified?: boolean;
};

export type UniverseStats = {
  total: number;
  activeScored: number; // Has ROMC AI score
  skeleton: number; // isSkeleton = true
  sourcesBreakdown: Record<UniverseSource, number>;
};

