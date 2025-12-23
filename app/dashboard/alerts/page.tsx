import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { getLangFromRequest } from "@/src/lib/i18n";
import { UserAlertRuleForm } from "@/components/dashboard/UserAlertRuleForm";
import { UserAlertRuleList } from "@/components/dashboard/UserAlertRuleList";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Alerte personalizate - RoMarketCap" : "Custom alerts - RoMarketCap";
  return {
    title,
    robots: { index: false, follow: false },
  };
}

export default async function DashboardAlertsPage() {
  const lang = await getLangFromRequest();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isPremium: true },
  });
  if (!user) redirect("/login");

  const rules = await prisma.userAlertRule.findMany({
    where: { userId: user.id },
    include: {
      company: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Get companies for company-scoped rules
  const watchlistCompanies = await prisma.watchlistItem.findMany({
    where: { userId: user.id },
    include: {
      company: {
        select: {
          id: true,
          slug: true,
          name: true,
          cui: true,
        },
      },
    },
    take: 100,
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {lang === "ro" ? "Alerte personalizate" : "Custom alerts"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ro"
            ? "Configurează alerte pentru schimbări de scor, evaluare sau risc."
            : "Configure alerts for score, valuation, or risk changes."}
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "Reguli active" : "Active rules"}</h2>
          </CardHeader>
          <CardBody>
            <UserAlertRuleList lang={lang} rules={rules} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "Creează regulă nouă" : "Create new rule"}</h2>
          </CardHeader>
          <CardBody>
            <UserAlertRuleForm
              lang={lang}
              watchlistCompanies={watchlistCompanies.map((w) => w.company)}
            />
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

