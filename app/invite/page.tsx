import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/db";
import { getSiteUrl } from "@/lib/seo/site";
import { getLangFromRequest } from "@/src/lib/i18n";
import { generateReferralCode } from "@/src/lib/referrals/code";
import { InviteClient } from "@/components/referrals/InviteClient";
import { Card, CardBody } from "@/components/ui/Card";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function InvitePage() {
  const lang = await getLangFromRequest();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  let code = (await prisma.referralCode.findUnique({ where: { userId: session.user.id }, select: { code: true } }))?.code ?? null;
  if (!code) {
    try {
      code = (
        await prisma.referralCode.create({
          data: { userId: session.user.id, code: generateReferralCode(10) },
          select: { code: true },
        })
      ).code;
    } catch {
      code = (await prisma.referralCode.findUnique({ where: { userId: session.user.id }, select: { code: true } }))?.code ?? null;
    }
  }
  if (!code) redirect("/billing");

  const link = `${getSiteUrl()}/?ref=${encodeURIComponent(code)}`;

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{lang === "ro" ? "Invite" : "Invite"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {lang === "ro"
            ? "Trimite linkul tău. Dacă cineva face upgrade, primești credit."
            : "Share your link. If someone upgrades, you receive credit."}
        </p>
      </header>
      <Card className="mt-6">
        <CardBody>
          <InviteClient lang={lang} link={link} />
        </CardBody>
      </Card>
    </main>
  );
}


