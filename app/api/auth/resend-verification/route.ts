import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { sendVerificationEmail } from "@/src/lib/email/sendVerification";
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
    // Rate limiting by IP
    const ip = ipFromRequest(req);
    const rl = await rateLimit(req, { kind: "anon", key: `resend-verification:ip:${ip}` });
    if (!rl.ok) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded. Please wait before trying again." }, { status: 429, headers: rl.headers });
    }

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid email address" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const emailHash = hashEmail(email);

    // Rate limiting per email (60 seconds)
    const emailKey = `resend-verification:email:${emailHash}`;
    const emailTtl = await kv.ttl(emailKey).catch(() => -2);
    if (emailTtl != null && emailTtl > 0) {
      const secondsLeft = Math.ceil(emailTtl);
      return NextResponse.json({ 
        ok: false, 
        error: `Please wait ${secondsLeft} second${secondsLeft !== 1 ? "s" : ""} before requesting another verification email.` 
      }, { status: 429 });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user) {
      // Don't reveal if user exists (security)
      return NextResponse.json({ 
        ok: true, 
        message: "If an account with this email exists and is not verified, a verification email has been sent." 
      });
    }

    // Check if already verified
    if (user.emailVerified) {
      return NextResponse.json({ 
        ok: false, 
        error: "This email is already verified. You can log in." 
      }, { status: 400 });
    }

    // Find existing valid token or create new one
    const existingToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        expires: { gt: new Date() }, // Not expired
      },
      orderBy: { expires: "desc" },
    });

    let token: string;
    let expires: Date;

    if (existingToken) {
      // Reuse existing valid token
      token = existingToken.token;
      expires = existingToken.expires;
    } else {
      // Create new token
      token = crypto.randomBytes(32).toString("hex");
      expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Delete old expired tokens for this email
      await prisma.verificationToken.deleteMany({
        where: {
          identifier: email,
          expires: { lt: new Date() },
        },
      }).catch(() => null);

      // Create new token
      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires,
        },
      });
    }

    // Send verification email
    await sendVerificationEmail(email, token, user.name);

    // Set rate limit (60 seconds)
    await kv.set(emailKey, "1", { ex: 60 });

    return NextResponse.json({ 
      ok: true, 
      message: "Verification email sent. Please check your inbox." 
    });
  } catch (error) {
    console.error("[resend-verification] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

