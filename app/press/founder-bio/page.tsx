import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/seo/site";
import { readFile } from "fs/promises";
import { join } from "path";
// Note: Install 'marked' package if needed

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const canonical = `${getSiteUrl()}/press/founder-bio`;
  return {
    title: "Founder Bio - RoMarketCap",
    description: "Founder biography for media use.",
    alternates: { canonical },
    robots: { index: true, follow: true },
  };
}

export default async function FounderBioPage() {
  let content = "";
  try {
    content = await readFile(join(process.cwd(), "press/founder-bio.md"), "utf-8");
  } catch (error) {
    console.error("Error reading founder bio:", error);
    content = "Content not available. Please check the server logs.";
  }

  // Simple markdown-like formatting
  const formattedContent = content
    .split("\n")
    .map((line) => {
      if (line.startsWith("# ")) {
        return `<h1 class="text-3xl font-bold mt-8 mb-4">${line.slice(2)}</h1>`;
      }
      if (line.startsWith("## ")) {
        return `<h2 class="text-2xl font-semibold mt-6 mb-3">${line.slice(3)}</h2>`;
      }
      if (line.startsWith("### ")) {
        return `<h3 class="text-xl font-medium mt-4 mb-2">${line.slice(4)}</h3>`;
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return `<li class="ml-4">${line.slice(2)}</li>`;
      }
      if (line.trim() === "") {
        return "<br />";
      }
      return `<p class="mb-4">${line}</p>`;
    })
    .join("");

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <article className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formattedContent }} />
    </main>
  );
}

