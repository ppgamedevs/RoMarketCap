import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function LegacyEnCompaniesSlugRedirect({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/lang?lang=en&next=${encodeURIComponent(`/company/${slug}`)}`);
}


