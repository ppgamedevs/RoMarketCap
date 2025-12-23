import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Generate and return a CSRF token.
 * Sets a cookie with the token for double-submit cookie validation.
 */
export async function GET() {
  const token = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  const isProduction = process.env.NODE_ENV === "production";
  cookieStore.set("csrf-token", token, {
    httpOnly: false, // Must be readable by JS for double-submit cookie pattern
    secure: isProduction, // HTTPS only in production
    sameSite: "lax", // CSRF protection while allowing cross-site GET requests
    maxAge: 60 * 60 * 24, // 24 hours
    path: "/",
  });

  return NextResponse.json({ token });
}

