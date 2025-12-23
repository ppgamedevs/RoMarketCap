import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { getSiteUrl } from "@/lib/seo/site";
import { getStripe } from "@/src/lib/stripe";
import { requireCsrf } from "@/src/lib/csrf/middleware";
import { rateLimit } from "@/src/lib/ratelimit";
import { shouldBlockMutation } from "@/src/lib/flags/readOnly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  // Rate limit
  const rl = await rateLimit(req, { kind: "auth", key: `user:${session.user.id}` });
  if (!rl.ok) return NextResponse.json({ ok: false, error: "Rate limit exceeded" }, { status: 429, headers: rl.headers });

  // Check read-only mode
  const block = await shouldBlockMutation(req, session.user.role === "admin");
  if (block.blocked) {
    return NextResponse.json({ ok: false, error: block.reason }, { status: 503, headers: rl.headers });
  }

  // CSRF protection
  const csrf = await requireCsrf(req);
  if (!csrf.ok) return NextResponse.json({ ok: false, error: csrf.error }, { status: csrf.status ?? 403, headers: rl.headers });

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.stripeCustomerId) return NextResponse.json({ ok: false, error: "No customer" }, { status: 400, headers: rl.headers });

  const stripe = getStripe();
  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${getSiteUrl()}/billing`,
  });

  return NextResponse.json({ ok: true, url: portal.url }, { headers: rl.headers });
}


