import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  const body = process.env.GOOGLE_SITE_VERIFICATION_FILE?.trim() ?? "";
  if (!body) return new NextResponse("Not configured", { status: 404 });
  const res = new NextResponse(body, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  res.headers.set("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=86400");
  return res;
}


