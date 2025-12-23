import { redirect } from "next/navigation";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ReferralLtvPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  // Calculate referral vs non-referral LTV
  // Track referral users via ReferralEvent data
  const [allPremiumUsers, referralEvents] = await Promise.all([
    prisma.user.findMany({
      where: {
        isPremium: true,
      },
      select: {
        id: true,
        email: true,
        premiumSince: true,
        stripeCustomerId: true,
      },
    }),
    prisma.referralEvent.findMany({
      where: {
        kind: "PREMIUM_CONVERSION",
        referredUserId: { not: null },
      },
      select: {
        referredUserId: true,
      },
    }),
  ]);

  // Separate referral vs non-referral users
  const referredUserIds = new Set(referralEvents.map((e) => e.referredUserId!).filter(Boolean));
  const referralUsersList = allPremiumUsers.filter((u) => referredUserIds.has(u.id));
  const nonReferralUsersList = allPremiumUsers.filter((u) => !referredUserIds.has(u.id));

  // Calculate average LTV (simplified: assume monthly subscription)
  const monthlyPrice = 29; // EUR
  const referralLtv = referralUsersList.length > 0
    ? referralUsersList.reduce((sum, u) => {
        if (!u.premiumSince) return sum;
        const months = Math.max(1, Math.floor((Date.now() - u.premiumSince.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        return sum + months * monthlyPrice;
      }, 0) / referralUsersList.length
    : 0;

  const nonReferralLtv = nonReferralUsersList.length > 0
    ? nonReferralUsersList.reduce((sum, u) => {
        if (!u.premiumSince) return sum;
        const months = Math.max(1, Math.floor((Date.now() - u.premiumSince.getTime()) / (1000 * 60 * 60 * 24 * 30)));
        return sum + months * monthlyPrice;
      }, 0) / nonReferralUsersList.length
    : 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Referral LTV Analysis</h1>
        <p className="mt-2 text-sm text-muted-foreground">Compare lifetime value of referral vs non-referral users.</p>
      </div>

      {/* Metrics */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">Referral Users</h3>
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-semibold">{referralUsersList.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Avg LTV: €{referralLtv.toFixed(2)}</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">Non-Referral Users</h3>
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-semibold">{nonReferralUsersList.length}</div>
            <div className="text-xs text-muted-foreground mt-1">Avg LTV: €{nonReferralLtv.toFixed(2)}</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">LTV Difference</h3>
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-semibold">
              {referralLtv > nonReferralLtv ? "+" : ""}
              {(((referralLtv - nonReferralLtv) / (nonReferralLtv || 1)) * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              €{(referralLtv - nonReferralLtv).toFixed(2)} difference
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Referral Users Table */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium">Referral Users</h2>
        </CardHeader>
        <CardBody>
          <Table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Referred By</th>
                <th>Premium Since</th>
                <th>Estimated LTV</th>
              </tr>
            </thead>
            <tbody>
              {referralUsersList.slice(0, 50).map((user) => {
                const months = user.premiumSince
                  ? Math.max(1, Math.floor((Date.now() - user.premiumSince.getTime()) / (1000 * 60 * 60 * 24 * 30)))
                  : 0;
                const estimatedLtv = months * monthlyPrice;
                return (
                  <tr key={user.id}>
                    <td>{user.email ?? "N/A"}</td>
                    <td>Referred</td>
                    <td>{user.premiumSince?.toISOString().slice(0, 10) ?? "N/A"}</td>
                    <td>€{estimatedLtv.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </CardBody>
      </Card>
    </main>
  );
}
