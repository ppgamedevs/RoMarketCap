import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { getLangFromRequest } from "@/src/lib/i18n";
import { ExportButtons } from "@/components/dashboard/ExportButtons";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const lang = await getLangFromRequest();
  const title = lang === "ro" ? "Export - RoMarketCap" : "Export - RoMarketCap";
  return {
    title,
    robots: { index: false, follow: false },
  };
}

export default async function DashboardExportsPage() {
  const lang = await getLangFromRequest();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, isPremium: true },
  });
  if (!user) redirect("/login");

  if (!user.isPremium) {
    redirect("/pricing?ctx_feature=export");
  }

  const watchlistItems = await prisma.watchlistItem.findMany({
    where: { userId: user.id },
    include: {
      company: {
        select: {
          slug: true,
          name: true,
          cui: true,
          romcScore: true,
          romcAiScore: true,
          romcConfidence: true,
          valuationRangeLow: true,
          valuationRangeHigh: true,
        },
      },
    },
    take: 500,
  });

  const comparisons = await prisma.savedComparison.findMany({
    where: { userId: user.id },
    take: 100,
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {lang === "ro" ? "Export date" : "Export data"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ro"
            ? "Exportă watchlist sau comparații în CSV sau JSON (Premium)."
            : "Export watchlist or comparisons to CSV or JSON (Premium)."}
        </p>
      </header>

      <div className="mt-6">
        <ExportButtons lang={lang} watchlistItems={watchlistItems} comparisons={comparisons} />
      </div>
    </main>
  );
}

