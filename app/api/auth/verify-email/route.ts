import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/src/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  token: z.string().min(1),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = QuerySchema.safeParse({ token: url.searchParams.get("token") });
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Invalid token" }, { status: 400 });
    }

    const { token } = parsed.data;

    // Find verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token },
    });

    if (!verificationToken) {
      return NextResponse.json({ 
        ok: false, 
        error: "Invalid or expired token",
        email: null, // Can't determine email from invalid token
      }, { status: 400 });
    }

    // Check expiration
    if (verificationToken.expires < new Date()) {
      // Clean up expired token
      await prisma.verificationToken.delete({ where: { token } }).catch(() => null);
      return NextResponse.json({ 
        ok: false, 
        error: "Token expired",
        email: verificationToken.identifier, // Include email for resend
      }, { status: 400 });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: verificationToken.identifier },
      select: { id: true, email: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ 
        ok: false, 
        error: "User not found",
        email: verificationToken.identifier, // Include email for resend
      }, { status: 400 });
    }

    // Update user email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    // Delete used token
    await prisma.verificationToken.delete({ where: { token } }).catch(() => null);

    return NextResponse.json({ ok: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("[verify-email] Error:", error);
    return NextResponse.json({ ok: false, error: "Internal server error" }, { status: 500 });
  }
}

