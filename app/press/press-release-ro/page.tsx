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
  let content = "";
  try {
    content = await readFile(join(process.cwd(), "press/press-release-ro.md"), "utf-8");
  } catch (error) {
    console.error("Error reading press release:", error);
    content = "Content not available. Please check the server logs.";
  }

  // Simple markdown-like formatting
  const formatLine = (line: string) => {
    // Handle bold text **text**
    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Handle horizontal rule ---
    if (line.trim() === "---") {
      return '<hr class="my-6 border-t" />';
    }
    return line;
  };

  const formattedContent = content
    .split("\n")
    .map((line) => {
      const formatted = formatLine(line);
      if (formatted.startsWith("# ")) {
        return `<h1 class="text-3xl font-bold mt-8 mb-4">${formatLine(formatted.slice(2))}</h1>`;
      }
      if (formatted.startsWith("## ")) {
        return `<h2 class="text-2xl font-semibold mt-6 mb-3">${formatLine(formatted.slice(3))}</h2>`;
      }
      if (formatted.startsWith("### ")) {
        return `<h3 class="text-xl font-medium mt-4 mb-2">${formatLine(formatted.slice(4))}</h3>`;
      }
      if (formatted.startsWith("- ") || formatted.startsWith("* ")) {
        return `<li class="ml-4 mb-2">${formatLine(formatted.slice(2))}</li>`;
      }
      if (formatted.trim() === "" || formatted.trim() === "<hr class=\"my-6 border-t\" />") {
        return formatted.trim() === "" ? "<br />" : formatted;
      }
      return `<p class="mb-4">${formatted}</p>`;
    })
    .join("");

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <article className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formattedContent }} />
    </main>
  );
}

