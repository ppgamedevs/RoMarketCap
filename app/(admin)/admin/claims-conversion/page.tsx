import { redirect } from "next/navigation";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Table } from "@/components/ui/Table";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ClaimsConversionPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  // Get claims with user premium status
  const claims = await prisma.companyClaim.findMany({
    where: {
      status: { in: ["APPROVED", "PENDING"] },
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          isPremium: true,
          premiumSince: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          cui: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Calculate conversion metrics
  const totalClaims = claims.length;
  const approvedClaims = claims.filter((c) => c.status === "APPROVED").length;
  const claimsWithPremium = claims.filter((c) => c.user.isPremium).length;
  const conversionRate = totalClaims > 0 ? (claimsWithPremium / totalClaims) * 100 : 0;

  // Claims that converted to premium (approved claim + user became premium after claim)
  const convertedClaims = claims.filter((c) => {
    if (c.status !== "APPROVED" || !c.user.isPremium) return false;
    if (!c.user.premiumSince) return false;
    return c.user.premiumSince >= c.createdAt;
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Claim-to-Premium Conversion</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Track how company claims convert to premium subscriptions.
        </p>
      </div>

      {/* Metrics */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">Total Claims</h3>
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-semibold">{totalClaims}</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">Approved</h3>
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-semibold">{approvedClaims}</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">With Premium</h3>
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-semibold">{claimsWithPremium}</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">Conversion Rate</h3>
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-semibold">{conversionRate.toFixed(1)}%</div>
          </CardBody>
        </Card>
      </div>

      {/* Claims Table */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium">Recent Claims</h2>
        </CardHeader>
        <CardBody>
          <Table>
            <thead>
              <tr>
                <th>Company</th>
                <th>User</th>
                <th>Status</th>
                <th>Claim Date</th>
                <th>Premium</th>
                <th>Converted</th>
              </tr>
            </thead>
            <tbody>
              {claims.map((claim) => {
                const converted =
                  claim.status === "APPROVED" &&
                  claim.user.isPremium &&
                  claim.user.premiumSince &&
                  claim.user.premiumSince >= claim.createdAt;

                return (
                  <tr key={claim.id}>
                    <td>
                      <div>
                        <div className="font-medium">{claim.company.name}</div>
                        <div className="text-xs text-muted-foreground">{claim.company.cui}</div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{claim.user.email ?? "N/A"}</div>
                    </td>
                    <td>
                      <Badge variant={claim.status === "APPROVED" ? "success" : "neutral"}>{claim.status}</Badge>
                    </td>
                    <td>
                      <div className="text-sm">{claim.createdAt.toISOString().slice(0, 10)}</div>
                    </td>
                    <td>
                      <Badge variant={claim.user.isPremium ? "success" : "neutral"}>
                        {claim.user.isPremium ? "Yes" : "No"}
                      </Badge>
                    </td>
                    <td>
                      {converted ? (
                        <Badge variant="success">Yes</Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">No</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </CardBody>
      </Card>

      {/* Conversion Summary */}
      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-sm font-medium">Conversion Summary</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total claims converted to premium:</span>
              <span className="font-medium">{convertedClaims.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Conversion rate (approved → premium):</span>
              <span className="font-medium">
                {approvedClaims > 0 ? ((convertedClaims.length / approvedClaims) * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Average days to conversion:</span>
              <span className="font-medium">
                {convertedClaims.length > 0
                  ? (
                      convertedClaims.reduce((sum, c) => {
                        if (!c.user.premiumSince) return sum;
                        const days = Math.floor(
                          (c.user.premiumSince.getTime() - c.createdAt.getTime()) / (1000 * 60 * 60 * 24),
                        );
                        return sum + days;
                      }, 0) / convertedClaims.length
                    ).toFixed(1)
                  : "N/A"}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}

