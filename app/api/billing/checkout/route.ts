import { NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { getSiteUrl } from "@/lib/seo/site";
import { getStripe } from "@/src/lib/stripe";
import { cookies } from "next/headers";
import { requireCsrf } from "@/src/lib/csrf/middleware";
import { rateLimit } from "@/src/lib/ratelimit";
import { shouldBlockMutation } from "@/src/lib/flags/readOnly";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  returnPath: z.string().optional(),
});

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

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400, headers: rl.headers });

  const priceId = process.env.STRIPE_PRICE_ID_MONTHLY;
  if (!priceId) return NextResponse.json({ ok: false, error: "STRIPE_PRICE_ID_MONTHLY not configured" }, { status: 500, headers: rl.headers });

  const baseUrl = getSiteUrl();
  const returnUrl = `${baseUrl}${parsed.data.returnPath ?? "/billing"}`;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return NextResponse.json({ ok: false, error: "User not found" }, { status: 404, headers: rl.headers });

  const stripe = getStripe();
  const ref = (await cookies()).get("romc_ref")?.value ?? null;

  let customerId = user.stripeCustomerId ?? null;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: returnUrl,
    cancel_url: `${baseUrl}/billing`,
    allow_promotion_codes: true,
    metadata: { userId: user.id, referralCode: ref ?? null, priceId },
  });

  return NextResponse.json({ ok: true, url: checkout.url }, { headers: rl.headers });
}


