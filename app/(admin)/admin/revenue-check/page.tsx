import { redirect } from "next/navigation";
import Link from "next/link";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { getAllFlags } from "@/src/lib/flags/flags";
import { RevenueCheckClient } from "./RevenueCheckClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function AdminRevenueCheckPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  const flags = await getAllFlags();

  // Check Stripe configuration
  const stripeOk =
    Boolean(process.env.STRIPE_SECRET_KEY) &&
    Boolean(process.env.STRIPE_WEBHOOK_SECRET) &&
    Boolean(process.env.STRIPE_PRICE_ID_MONTHLY);

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Revenue Day-1 Switch</h1>
      <p className="mt-2 text-sm text-muted-foreground">Verify paywalls and placements are ready for production.</p>

      <RevenueCheckClient flags={flags} stripeOk={stripeOk} />

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <Link className="underline underline-offset-4" href="/admin">
          Admin Home
        </Link>
        <Link className="underline underline-offset-4" href="/admin/launch">
          Launch
        </Link>
        <Link className="underline underline-offset-4" href="/admin/flags">
          Flags
        </Link>
      </div>
    </main>
  );
}

