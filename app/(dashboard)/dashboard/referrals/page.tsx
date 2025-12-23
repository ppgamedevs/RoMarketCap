import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { getLangFromRequest } from "@/src/lib/i18n";
import { ReferralLeaderboard } from "@/components/referrals/ReferralLeaderboard";
import { ReferralStats } from "@/components/referrals/ReferralStats";
import { CopyButton } from "@/components/referrals/CopyButton";
import { ApplyCreditsButton } from "@/components/referrals/ApplyCreditsButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function ReferralsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const lang = await getLangFromRequest();

  // Get user's referral code
  const referralCode = await prisma.referralCode.findUnique({
    where: { userId: session.user.id },
    select: { code: true },
  });

  // Get referral stats
  const [referralEvents, referralCredits, userStats] = await Promise.all([
    prisma.referralEvent.findMany({
      where: { referrerUserId: session.user.id },
      include: {
        referred: {
          select: {
            id: true,
            email: true,
            isPremium: true,
            premiumSince: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.referralCredit.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        referralLtv: true,
        exportCredits: true,
        premiumUntil: true,
      },
    }),
  ]);

  const totalConversions = referralEvents.filter((e) => e.kind === "PREMIUM_CONVERSION").length;
  const totalLandings = referralEvents.filter((e) => e.kind === "LANDING").length;
  const pendingCredits = referralCredits.filter((c) => c.status === "PENDING");
  const appliedCredits = referralCredits.filter((c) => c.status === "APPLIED");

  const totalDaysEarned = appliedCredits.reduce((sum, c) => sum + c.days, 0);
  const totalExportCreditsEarned = appliedCredits.reduce((sum, c) => sum + c.exportCredits, 0);
  const pendingDays = pendingCredits.reduce((sum, c) => sum + c.days, 0);
  const pendingExportCredits = pendingCredits.reduce((sum, c) => sum + c.exportCredits, 0);

  const referralLink = referralCode
    ? `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/?ref=${encodeURIComponent(referralCode.code)}`
    : null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {lang === "ro" ? "Program de recomandare" : "Referral Program"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ro"
            ? "Invită prieteni și primește recompense: zile premium și credite de export."
            : "Invite friends and earn rewards: premium days and export credits."}
        </p>
      </header>

      {/* Referral Link */}
      {referralLink && (
        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "Link-ul tău" : "Your link"}</h2>
          </CardHeader>
          <CardBody>
            <div className="flex items-center gap-3">
              <input
                readOnly
                value={referralLink}
                className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
              />
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(referralLink);
                }}
              >
                {lang === "ro" ? "Copiază" : "Copy"}
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Stats */}
      <ReferralStats
        lang={lang}
        totalConversions={totalConversions}
        totalLandings={totalLandings}
        totalDaysEarned={totalDaysEarned}
        totalExportCreditsEarned={totalExportCreditsEarned}
        pendingDays={pendingDays}
        pendingExportCredits={pendingExportCredits}
        referralLtv={userStats?.referralLtv ? Number(userStats.referralLtv) : 0}
      />

      {/* Leaderboard */}
      <ReferralLeaderboard lang={lang} userId={session.user.id} />

      {/* Recent Activity */}
      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-sm font-medium">{lang === "ro" ? "Activitate recentă" : "Recent activity"}</h2>
        </CardHeader>
        <CardBody>
          <div className="space-y-2 text-sm">
            {referralEvents.length === 0 ? (
              <p className="text-muted-foreground">
                {lang === "ro" ? "Nicio activitate încă." : "No activity yet."}
              </p>
            ) : (
              referralEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <div className="font-medium">
                      {event.kind === "PREMIUM_CONVERSION"
                        ? lang === "ro"
                          ? "Conversie premium"
                          : "Premium conversion"
                        : lang === "ro"
                          ? "Landing"
                          : "Landing"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {event.createdAt.toISOString().slice(0, 10)}
                    </div>
                  </div>
                  <Badge variant={event.kind === "PREMIUM_CONVERSION" ? "success" : "neutral"}>
                    {event.kind === "PREMIUM_CONVERSION" ? "✓" : "→"}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardBody>
      </Card>

      {/* Apply Pending Credits */}
      {pendingCredits.length > 0 && (
        <Card className="mt-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <h2 className="text-sm font-medium">
              {lang === "ro" ? "Credite în așteptare" : "Pending credits"}
            </h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {lang === "ro"
                  ? `Ai ${pendingDays} zile premium și ${pendingExportCredits} credite de export în așteptare.`
                  : `You have ${pendingDays} premium days and ${pendingExportCredits} export credits pending.`}
              </p>
              <ApplyCreditsButton lang={lang} />
            </div>
          </CardBody>
        </Card>
      )}
    </main>
  );
}

