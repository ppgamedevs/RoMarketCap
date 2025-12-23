import { prisma } from "@/src/lib/db";
import { kv } from "@vercel/kv";
import { hashApiKey } from "./hash";

export type ApiKeyContext =
  | { ok: false }
  | {
      ok: true;
      id: string;
      plan: "FREE" | "PARTNER" | "PREMIUM";
      rateLimitKind: "anon" | "auth" | "premium";
    };

export async function getApiKeyContext(req: Request): Promise<ApiKeyContext> {
  const raw = req.headers.get("x-api-key")?.trim();
  if (!raw) return { ok: false };
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return { ok: false };

  const keyHash = hashApiKey(raw, secret);
  const key = await prisma.apiKey.findUnique({
    where: { keyHash },
    select: { id: true, plan: true, active: true, rateLimitKind: true },
  });
  if (!key || !key.active) return { ok: false };

  prisma.apiKey
    .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
    .catch(() => null);

  const day = new Date().toISOString().slice(0, 10);
  kv.incr(`apikey:usage:${key.id}:${day}`).catch(() => null);

  const kind = key.rateLimitKind === "premium" ? "premium" : key.rateLimitKind === "auth" ? "auth" : "anon";
  const plan = key.plan === "PREMIUM" ? "PREMIUM" : key.plan === "PARTNER" ? "PARTNER" : "FREE";
  return { ok: true, id: key.id, plan, rateLimitKind: kind };
}


