import { kv } from "@vercel/kv";

export type CooldownKind = "claim" | "submission";

export function cooldownKey(kind: CooldownKind, userId: string, companyId: string) {
  return `cooldown:${kind}:${userId}:${companyId}`;
}

export function cooldownSeconds(kind: CooldownKind) {
  return kind === "claim" ? 60 * 60 * 24 * 30 : 60 * 60 * 24 * 7;
}

export async function getCooldownRemainingSeconds(kind: CooldownKind, userId: string, companyId: string): Promise<number> {
  const key = cooldownKey(kind, userId, companyId);
  const ttl = await kv.ttl(key).catch(() => -2);
  if (ttl == null) return 0;
  if (ttl < 0) return 0;
  return ttl;
}

export async function enforceCooldown(kind: CooldownKind, userId: string, companyId: string) {
  const remaining = await getCooldownRemainingSeconds(kind, userId, companyId);
  if (remaining > 0) return { ok: false as const, remainingSeconds: remaining };
  return { ok: true as const, remainingSeconds: 0 };
}

export async function setCooldown(kind: CooldownKind, userId: string, companyId: string) {
  const key = cooldownKey(kind, userId, companyId);
  const seconds = cooldownSeconds(kind);
  await kv.set(key, "1", { ex: seconds });
}


