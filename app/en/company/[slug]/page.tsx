import { redirect } from "next/navigation";

export const runtime = "nodejs";

type PageProps = { params: Promise<{ slug: string }> };

export default async function EnCompanyRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/lang?lang=en&next=${encodeURIComponent(`/company/${slug}`)}`);
}


