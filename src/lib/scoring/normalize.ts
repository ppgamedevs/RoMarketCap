export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function normalizeMinMax(value: number | null, min: number, max: number): number {
  if (value == null || !Number.isFinite(value)) return 0;
  if (max === min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

export function toFiniteNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  // Prisma Decimal and other numeric-like objects
  if (typeof value === "object" && value && "toString" in value) {
    const n = Number(String((value as { toString: () => string }).toString()));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function daysSince(date: Date | null | undefined, now: Date): number | null {
  if (!date) return null;
  const ms = now.getTime() - date.getTime();
  if (!Number.isFinite(ms)) return null;
  return ms / (1000 * 60 * 60 * 24);
}


