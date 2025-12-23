import crypto from "crypto";

export function hashApiKey(raw: string, secret: string) {
  return crypto.createHash("sha256").update(`${secret}:${raw}`).digest("hex");
}

export function last4(raw: string) {
  const s = raw.trim();
  return s.slice(-4);
}


