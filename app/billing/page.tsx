import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { BillingButtons } from "@/components/billing/BillingButtons";
import { getLangFromRequest, t } from "@/src/lib/i18n";
import { TrackCheckoutSuccess } from "@/components/analytics/TrackCheckoutSuccess";
import { normalizeLaunchOfferText } from "@/src/lib/offer";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Alert } from "@/components/ui/Alert";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const lang = await getLangFromRequest();
  const offer = normalizeLaunchOfferText(process.env.NEXT_PUBLIC_LAUNCH_OFFER_TEXT);
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/login");

  const isPremium = Boolean(user.isPremium);
  const status = user.subscriptionStatus ?? "none";
  const credits = await prisma.referralCredit.aggregate({
    where: { userId: user.id, status: "PENDING" },
    _sum: { days: true },
  });
  const creditDays = credits._sum.days ?? 0;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <TrackCheckoutSuccess />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t(lang, "nav_billing")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ro" ? "Autentificat ca" : "Signed in as"} {session.user.email}
        </p>
      </header>

      {offer && (
        <Alert variant="info" className="mt-4">
          <p className="text-sm">{offer}</p>
        </Alert>
      )}

      <Card className="mt-6">
        <CardHeader>
          <h2 className="text-sm font-medium">Status</h2>
        </CardHeader>
        <CardBody className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{lang === "ro" ? "Premium" : "Premium"}:</span>
            <Badge variant={isPremium ? "success" : "neutral"}>{isPremium ? (lang === "ro" ? "activ" : "active") : (lang === "ro" ? "inactiv" : "inactive")}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {lang === "ro" ? "Status abonament" : "Subscription status"}: <span className="font-medium">{status}</span>
          </p>
          {creditDays > 0 && (
            <p className="text-sm text-muted-foreground">
              {lang === "ro" ? "Credit referral (zile)" : "Referral credit (days)"}: <span className="font-medium">{creditDays}</span>
            </p>
          )}
          {user.currentPeriodEnd && (
            <p className="text-sm text-muted-foreground">
              {lang === "ro" ? "Perioada curentă se termină" : "Current period ends"}: <span className="font-medium">{user.currentPeriodEnd.toISOString().slice(0, 10)}</span>
            </p>
          )}
        </CardBody>
      </Card>

      <BillingButtons isPremium={isPremium} />

      <p className="mt-6 text-xs text-muted-foreground">{t(lang, "disclaimer")}</p>
    </main>
  );
}


