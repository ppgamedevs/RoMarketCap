import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function RoCompanyAliasPage({ params }: PageProps) {
  const { slug } = await params;
  redirect(`/company/${slug}`);
}


