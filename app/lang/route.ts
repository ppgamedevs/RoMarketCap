import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { normalizeLang } from "@/src/lib/i18n";

export const runtime = "nodejs";

export function GET(req: NextRequest) {
  const url = new URL(req.url);
  const lang = normalizeLang(url.searchParams.get("lang"));
  const next = url.searchParams.get("next") ?? "/";

  const res = NextResponse.redirect(new URL(next, url.origin));
  res.cookies.set("romc_lang", lang, {
    httpOnly: false,
    sameSite: "lax",
    secure: url.protocol === "https:",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  return res;
}


