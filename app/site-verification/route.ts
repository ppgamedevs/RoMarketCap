import { NextResponse } from "next/server";

export const runtime = "nodejs";

export function GET() {
  const google = process.env.GOOGLE_SITE_VERIFICATION_FILE?.trim();
  const bing = process.env.BING_SITE_VERIFICATION_FILE?.trim();

  const body = `
<html><head><meta charset="utf-8"><title>Site verification</title></head>
<body style="font-family:system-ui;max-width:720px;margin:40px auto;padding:0 16px;line-height:1.5">
<h1>Site verification</h1>
<p>This endpoint is for search console verification content. Configure env vars to serve file bodies.</p>
<h2>Google</h2>
<p>${google ? "Configured" : "Not configured"}</p>
<h2>Bing</h2>
<p>${bing ? "Configured" : "Not configured"}</p>
</body></html>`;

  const res = new NextResponse(body, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } });
  res.headers.set("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return res;
}


