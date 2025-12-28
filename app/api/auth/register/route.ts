import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { hashPassword } from "@/src/lib/auth/password";
import { sendVerificationEmail } from "@/src/lib/email/sendVerification";
import { rateLimit } from "@/src/lib/ratelimit";
import crypto from "crypto";
import { kv } from "@vercel/kv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(8).max(100),
  name: z.string().max(100).optional(),
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
    const rl = await rateLimit(req, { kind: "anon", key: `register:ip:${ip}` });
    if (!rl.ok) {
      return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });
    }

    const body = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid input" }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase().trim();
    const emailHash = hashEmail(email);

    // Additional rate limiting per email
    const emailKey = `register:email:${emailHash}`;
    const emailTtl = await kv.ttl(emailKey).catch(() => -2);
    if (emailTtl != null && emailTtl > 0) {
      return NextResponse.json({ ok: false, error: "Please wait before trying again" }, { status: 429 });
    }
    await kv.set(emailKey, "1", { ex: 300 }); // 5 minute cooldown per email

    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, emailVerified: true },
    });

    if (existing) {
      // Don't reveal if email is verified or not (security)
      return NextResponse.json({ ok: false, error: "An account with this email already exists" }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await hashPassword(parsed.data.password);

    // Check if this is an admin email
    const adminEmails = new Set(["ppgamedevs@gmail.com"]);
    const isAdmin = adminEmails.has(email.toLowerCase());

    // Create user
    try {
      const user = await prisma.user.create({
        data: {
          email,
          name: parsed.data.name?.trim() || null,
          password: hashedPassword,
          emailVerified: null, // Not verified yet
          role: isAdmin ? "admin" : "user", // Set admin role on registration
        },
        select: { id: true, email: true, name: true },
      });

      // Generate verification token
      const token = crypto.randomBytes(32).toString("hex");
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await prisma.verificationToken.create({
        data: {
          identifier: email,
          token,
          expires,
        },
      });

      // Send verification email
      await sendVerificationEmail(email, token, user.name);

      return NextResponse.json({ ok: true, message: "Registration successful. Please check your email to verify your account." });
    } catch (createError) {
      console.error("[register] Error creating user:", createError);
      // If it's a Prisma error, provide more details
      if (createError && typeof createError === "object" && "code" in createError) {
        const prismaError = createError as { code: string; message: string };
        if (prismaError.code === "P2002") {
          return NextResponse.json({ ok: false, error: "An account with this email already exists" }, { status: 400 });
        }
        return NextResponse.json({ 
          ok: false, 
          error: `Database error: ${prismaError.message}` 
        }, { status: 500 });
      }
      throw createError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    console.error("[register] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ ok: false, error: errorMessage }, { status: 500 });
  }
}

