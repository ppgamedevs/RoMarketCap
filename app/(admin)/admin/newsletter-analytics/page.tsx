import { redirect } from "next/navigation";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";
import { prisma } from "@/src/lib/db";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NewsletterAnalyticsPage() {
  const session = await requireAdminSession();
  if (!session) redirect("/");

  // Get newsletter subscribers with tracking data
  const subscribers = await prisma.newsletterSubscriber.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      email: true,
      status: true,
      confirmedAt: true,
      createdAt: true,
      totalEmailsSent: true,
      totalOpens: true,
      totalClicks: true,
      lastOpenedAt: true,
      lastClickedAt: true,
      lastEmailSentAt: true,
    },
  });

  // Calculate aggregate metrics
  const totalSubscribers = await prisma.newsletterSubscriber.count({ where: { status: "ACTIVE" } });
  const confirmedSubscribers = await prisma.newsletterSubscriber.count({ where: { status: "ACTIVE", confirmedAt: { not: null } } });
  
  const totalEmailsSent = subscribers.reduce((sum, s) => sum + s.totalEmailsSent, 0);
  const totalOpens = subscribers.reduce((sum, s) => sum + s.totalOpens, 0);
  const totalClicks = subscribers.reduce((sum, s) => sum + s.totalClicks, 0);

  const openRate = totalEmailsSent > 0 ? (totalOpens / totalEmailsSent) * 100 : 0;
  const clickRate = totalEmailsSent > 0 ? (totalClicks / totalEmailsSent) * 100 : 0;
  const clickToOpenRate = totalOpens > 0 ? (totalClicks / totalOpens) * 100 : 0;

  // Get premium conversions from email (users who subscribed to newsletter and later became premium)
  const premiumConversions = await prisma.user.findMany({
    where: {
      isPremium: true,
      premiumSince: { not: null },
      email: {
        in: subscribers.map((s) => s.email),
      },
    },
    select: {
      id: true,
      email: true,
      premiumSince: true,
    },
  });

  const conversionRate = confirmedSubscribers > 0 ? (premiumConversions.length / confirmedSubscribers) * 100 : 0;

  return (
    <main className="mx-auto max-w-6xl px-6 py-16">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Newsletter Analytics</h1>
        <p className="mt-2 text-sm text-muted-foreground">Track newsletter performance, opens, clicks, and conversions.</p>
      </div>

      {/* Metrics */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">Total Subscribers</h3>
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-semibold">{totalSubscribers}</div>
            <div className="text-xs text-muted-foreground mt-1">{confirmedSubscribers} confirmed</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">Open Rate</h3>
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-semibold">{openRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">{totalOpens} opens / {totalEmailsSent} sent</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">Click Rate</h3>
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-semibold">{clickRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">{totalClicks} clicks / {totalEmailsSent} sent</div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h3 className="text-sm font-medium">Premium Conversion</h3>
          </CardHeader>
          <CardBody>
            <div className="text-2xl font-semibold">{conversionRate.toFixed(1)}%</div>
            <div className="text-xs text-muted-foreground mt-1">{premiumConversions.length} converted</div>
          </CardBody>
        </Card>
      </div>

      {/* Subscribers Table */}
      <Card>
        <CardHeader>
          <h2 className="text-sm font-medium">Recent Subscribers</h2>
        </CardHeader>
        <CardBody>
          <Table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Status</th>
                <th>Subscribed</th>
                <th>Emails Sent</th>
                <th>Opens</th>
                <th>Clicks</th>
                <th>Open Rate</th>
                <th>Click Rate</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((sub) => {
                const subOpenRate = sub.totalEmailsSent > 0 ? (sub.totalOpens / sub.totalEmailsSent) * 100 : 0;
                const subClickRate = sub.totalEmailsSent > 0 ? (sub.totalClicks / sub.totalEmailsSent) * 100 : 0;
                return (
                  <tr key={sub.id}>
                    <td>
                      <div className="text-sm">{sub.email}</div>
                    </td>
                    <td>
                      <Badge variant={sub.status === "ACTIVE" ? "success" : "neutral"}>{sub.status}</Badge>
                    </td>
                    <td>
                      <div className="text-sm">{sub.createdAt.toISOString().slice(0, 10)}</div>
                      {sub.confirmedAt ? (
                        <div className="text-xs text-muted-foreground">Confirmed</div>
                      ) : (
                        <div className="text-xs text-muted-foreground">Pending</div>
                      )}
                    </td>
                    <td>
                      <div className="text-sm">{sub.totalEmailsSent}</div>
                    </td>
                    <td>
                      <div className="text-sm">{sub.totalOpens}</div>
                      {sub.lastOpenedAt && (
                        <div className="text-xs text-muted-foreground">Last: {sub.lastOpenedAt.toISOString().slice(0, 10)}</div>
                      )}
                    </td>
                    <td>
                      <div className="text-sm">{sub.totalClicks}</div>
                      {sub.lastClickedAt && (
                        <div className="text-xs text-muted-foreground">Last: {sub.lastClickedAt.toISOString().slice(0, 10)}</div>
                      )}
                    </td>
                    <td>
                      <div className="text-sm">{subOpenRate.toFixed(1)}%</div>
                    </td>
                    <td>
                      <div className="text-sm">{subClickRate.toFixed(1)}%</div>
                    </td>
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

