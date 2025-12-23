import { redirect } from "next/navigation";
import { prisma } from "@/src/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Redirect old slugs to canonical slugs.
 * This route handles cases where a company's slug changed.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const company = await prisma.company.findFirst({
    where: {
      OR: [{ slug }, { canonicalSlug: slug }],
    },
    select: { canonicalSlug: true, slug: true },
  });

  if (!company) {
    return new Response("Not Found", { status: 404 });
  }

  // Redirect to canonical slug (or current slug if canonical is null)
  const canonical = company.canonicalSlug ?? company.slug;
  if (slug !== canonical) {
    redirect(`/company/${canonical}`);
  }

  // If already canonical, redirect to main page
  redirect(`/company/${canonical}`);
}

