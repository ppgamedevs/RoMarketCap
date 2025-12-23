import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo/site";
import { readFile } from "fs/promises";
import { join } from "path";
// Note: Install 'marked' package if needed

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${getSiteUrl()}/press/journalist-faq`;
  return {
    title: "FAQ for Journalists - RoMarketCap",
    description: "Frequently asked questions for journalists.",
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

export default async function JournalistFaqPage() {
  const content = await readFile(join(process.cwd(), "press/journalist-faq.md"), "utf-8").catch(() => "");

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <article className="prose prose-sm max-w-none whitespace-pre-wrap">{content || "Content not available."}</article>
    </main>
  );
}

