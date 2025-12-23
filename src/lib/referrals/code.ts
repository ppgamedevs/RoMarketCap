import crypto from "crypto";

const ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz"; // avoid ambiguous chars

export function generateReferralCode(len = 10): string {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += ALPHABET[bytes[i]! % ALPHABET.length]!;
  }
  return out;
}


