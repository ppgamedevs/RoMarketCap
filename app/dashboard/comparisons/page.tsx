import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { getLangFromRequest } from "@/src/lib/i18n";
import { SavedComparisonList } from "@/components/dashboard/SavedComparisonList";
import { SavedComparisonForm } from "@/components/dashboard/SavedComparisonForm";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Comparații salvate - RoMarketCap" : "Saved comparisons - RoMarketCap";
  return {
    title,
    robots: { index: false, follow: false },
  };
}

export default async function DashboardComparisonsPage() {
  const lang = await getLangFromRequest();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!user) redirect("/login");

  const comparisons = await prisma.savedComparison.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {lang === "ro" ? "Comparații salvate" : "Saved comparisons"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ro"
            ? "Salvează și urmărește comparații între companii (2-5 CUIs)."
            : "Save and track comparisons between companies (2-5 CUIs)."}
        </p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "Comparații existente" : "Existing comparisons"}</h2>
          </CardHeader>
          <CardBody>
            <SavedComparisonList lang={lang} comparisons={comparisons} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <h2 className="text-sm font-medium">{lang === "ro" ? "Creează comparație nouă" : "Create new comparison"}</h2>
          </CardHeader>
          <CardBody>
            <SavedComparisonForm lang={lang} />
          </CardBody>
        </Card>
      </div>
    </main>
  );
}

