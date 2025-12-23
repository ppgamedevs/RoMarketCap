import crypto from "crypto";

function base64Url(input: Buffer | string) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function hmacSha256(secret: string, value: string) {
  return crypto.createHmac("sha256", secret).update(value).digest();
}

function getSecret() {
  const s = process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("NEXTAUTH_SECRET not configured");
  return s;
}

export function signNewsletterConfirmToken(subscriberId: string): string {
  const secret = getSecret();
  const sig = base64Url(hmacSha256(secret, subscriberId));
  return `${subscriberId}.${sig}`;
}

export function verifyNewsletterConfirmToken(token: string): { ok: true; subscriberId: string } | { ok: false } {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return { ok: false };
  const [subscriberId, sig] = token.split(".");
  if (!subscriberId || !sig) return { ok: false };
  const expected = base64Url(hmacSha256(secret, subscriberId));
  if (expected !== sig) return { ok: false };
  return { ok: true, subscriberId };
}


