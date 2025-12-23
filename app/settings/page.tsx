import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { getLangFromRequest } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { SettingsAccountInfo } from "@/components/settings/SettingsAccountInfo";
import { SettingsNotifications } from "@/components/settings/SettingsNotifications";
import { ExportDataButton } from "@/components/settings/ExportDataButton";
import { DeleteAccountButton } from "@/components/settings/DeleteAccountButton";
import { TrackSettingsView } from "@/components/analytics/TrackSettingsView";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Setări cont - RoMarketCap" : "Account Settings - RoMarketCap";
  const description = lang === "ro" ? "Gestionează setările contului tău." : "Manage your account settings.";
  const canonical = `${getSiteUrl()}/settings`;
  return { title, description, alternates: { canonical }, robots: { index: false, follow: false } };
}

export default async function SettingsPage() {
  const lang = await getLangFromRequest();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const [user, notificationSettings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        isPremium: true,
        subscriptionStatus: true,
        currentPeriodEnd: true,
        stripeCustomerId: true,
        accounts: { select: { provider: true } },
      },
    }),
    prisma.userNotificationSettings.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <TrackSettingsView />
      <h1 className="text-2xl font-semibold tracking-tight">{lang === "ro" ? "Setări cont" : "Account Settings"}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {lang === "ro" ? "Gestionează informațiile contului și preferințele tale." : "Manage your account information and preferences."}
      </p>

      <div className="mt-6 space-y-6">
        <SettingsAccountInfo lang={lang} user={user} />
        <SettingsNotifications lang={lang} initialSettings={notificationSettings} />
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "Export date (GDPR)" : "Data Export (GDPR)"}</h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-muted-foreground">
              {lang === "ro"
                ? "Descarcă toate datele tale în format JSON conform GDPR."
                : "Download all your data in JSON format per GDPR."}
            </p>
            <div className="mt-4">
              <ExportDataButton lang={lang} />
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium text-destructive">{lang === "ro" ? "Șterge cont" : "Delete Account"}</h2>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-muted-foreground">
              {lang === "ro"
                ? "Ștergerea contului este permanentă și nu poate fi anulată. Toate datele tale vor fi șterse sau anonimizate."
                : "Account deletion is permanent and cannot be undone. All your data will be deleted or anonymized."}
            </p>
            {user.isPremium && user.stripeCustomerId && (
              <p className="mt-2 text-sm text-yellow-600">
                {lang === "ro"
                  ? "Atenție: Ai un abonament activ. Te rugăm să anulezi abonamentul din Billing Portal înainte de a șterge contul."
                  : "Warning: You have an active subscription. Please cancel your subscription from the Billing Portal before deleting your account."}
              </p>
            )}
            <div className="mt-4">
              <DeleteAccountButton lang={lang} isPremium={user.isPremium} />
            </div>
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

