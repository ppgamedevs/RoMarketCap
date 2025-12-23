import type { Metadata } from "next";
import { getLangFromRequest } from "@/src/lib/i18n";
import { getSiteUrl } from "@/lib/seo/site";
import { readFile } from "fs/promises";
import { join } from "path";
// Note: Install 'marked' package if needed: npm install marked
// For now, render markdown as plain text or use a different approach

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${getSiteUrl()}/press/press-release-ro`;
  return {
    title: "Comunicat de Presă (RO) - RoMarketCap",
    description: "Comunicat de presă în limba română pentru lansarea RoMarketCap.",
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

export default async function PressReleaseRoPage() {
  const lang = await getLangFromRequest();
  const content = await readFile(join(process.cwd(), "press/press-release-ro.md"), "utf-8").catch(() => "");

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <article className="prose prose-sm max-w-none whitespace-pre-wrap">{content || "Content not available."}</article>
    </main>
  );
}

