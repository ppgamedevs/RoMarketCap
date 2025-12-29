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
    let verificationToken;
    try {
      // Try findUnique first (requires unique index on token)
      try {
        verificationToken = await prisma.verificationToken.findUnique({
          where: { token },
        });
      } catch (uniqueError) {
        // If findUnique fails (e.g., no unique constraint), fallback to findFirst
        console.warn("[verify-email] findUnique failed, trying findFirst:", uniqueError);
        verificationToken = await prisma.verificationToken.findFirst({
          where: { token },
        });
      }
    } catch (dbError) {
      console.error("[verify-email] Database error finding token:", dbError);
      // Check if it's a table doesn't exist error
      if (dbError && typeof dbError === "object" && "code" in dbError) {
        const prismaError = dbError as { code: string; message: string };
        if (prismaError.code === "P2021" || prismaError.code === "42P01") {
          return NextResponse.json({ 
            ok: false, 
            error: "Verification system not properly configured. Please contact support.",
            email: null,
          }, { status: 500 });
        }
      }
      throw dbError;
    }

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
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: verificationToken.identifier },
        select: { id: true, email: true, emailVerified: true },
      });
    } catch (dbError) {
      console.error("[verify-email] Database error finding user:", dbError);
      return NextResponse.json({ 
        ok: false, 
        error: "Database error. Please try again or contact support.",
        email: verificationToken.identifier,
      }, { status: 500 });
    }

    if (!user) {
      return NextResponse.json({ 
        ok: false, 
        error: "User not found",
        email: verificationToken.identifier, // Include email for resend
      }, { status: 400 });
    }

    // Update user email as verified
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    } catch (updateError) {
      console.error("[verify-email] Database error updating user:", updateError);
      return NextResponse.json({ 
        ok: false, 
        error: "Failed to verify email. Please try again or contact support.",
        email: verificationToken.identifier,
      }, { status: 500 });
    }

    // Delete used token (non-critical, so we catch errors)
    await prisma.verificationToken.delete({ where: { token } }).catch((deleteError) => {
      console.error("[verify-email] Warning: Failed to delete token:", deleteError);
      // Don't fail the request if token deletion fails
    });

    return NextResponse.json({ ok: true, message: "Email verified successfully" });
  } catch (error) {
    console.error("[verify-email] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ 
      ok: false, 
      error: "Internal server error",
      details: process.env.NODE_ENV === "development" ? errorMessage : undefined,
    }, { status: 500 });
  }
}

