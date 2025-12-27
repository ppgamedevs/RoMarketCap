import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { sendPasswordResetEmail } from "@/src/lib/email/sendPasswordReset";
import { rateLimit } from "@/src/lib/ratelimit";
import crypto from "crypto";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().email().max(200),
});

function ipFromRequest(req: Request): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase()).digest("hex");
}

export async function POST(req: Request) {
  try {
    // Rate limiting
    const ip = ipFromRequest(req);
    const rl = await rateLimit(req, { kind: "anon", key: `forgot-password:ip:${ip}` });
    if (!rl.ok) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });
    }

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const emailHash = hashEmail(email);

    // Additional rate limiting per email (prevent enumeration)
    const emailKey = `forgot-password:email:${emailHash}`;
    const emailTtl = await kv.ttl(emailKey).catch(() => -2);
    if (emailTtl != null && emailTtl > 0) {
      // Don't reveal if email exists or not (security)
      return NextResponse.json({ ok: true, message: "If an account exists with this email, a password reset link has been sent." });
    }
    await kv.set(emailKey, "1", { ex: 300 }); // 5 minute cooldown per email

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, password: true },
    });

    // Don't reveal if user exists or not (security)
    // But only send email if user exists and has a password (not OAuth-only)
    if (user && user.password) {
      // Generate reset token
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Delete any existing tokens for this email (both verification and reset tokens)
      // This ensures only one active token exists per email at a time
      await prisma.verificationToken.deleteMany({
        where: {
          identifier: email,
        },
      }).catch(() => null);

      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires,
        },
      });

      // Send reset email
      await sendPasswordResetEmail(email, token, user.name);
    }

    // Always return success (don't reveal if email exists)
    return NextResponse.json({ ok: true, message: "If an account exists with this email, a password reset link has been sent." });
  } catch (error) {
    console.error("[forgot-password] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

