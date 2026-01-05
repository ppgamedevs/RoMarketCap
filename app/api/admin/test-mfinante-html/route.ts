/**
 * Debug endpoint to see raw HTML from mfinante.gov.ro
 * Used to understand the actual HTML structure for parsing
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUEST_TIMEOUT_MS = 10000; // 10 seconds timeout

export async function GET(req: NextRequest) {
  try {
    await requireAdminSession();

    const url = new URL(req.url);
    const cui = url.searchParams.get("cui");

    if (!cui) {
      return NextResponse.json({
        ok: false,
        error: "Missing cui parameter. Use ?cui=12345678",
        example: "/api/admin/test-mfinante-html?cui=5022670",
      }, { status: 400 });
    }

    // Normalize CUI (remove RO prefix if present)
    const normalizedCui = cui.replace(/^RO/i, "").trim();

    // Fetch from mfinante.gov.ro
    const mfinanteUrl = `https://mfinante.gov.ro/apps/infocodfiscal.html?cod=${encodeURIComponent(normalizedCui)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    const response = await fetch(mfinanteUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RoMarketCap/1.0; +https://romarketcap.com)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ro-RO,ro;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return NextResponse.json({
        ok: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        url: mfinanteUrl,
      }, { status: response.status });
    }

    const html = await response.text();

    // Extract key sections for analysis
    const keySections: Record<string, string> = {};
    
    // Look for common patterns
    const patterns = {
      "title": /<title[^>]*>([^<]+)<\/title>/i,
      "denumire": /(?:Denumire|denumire)[^<]*>([^<]+)</i,
      "data_infiintare": /(?:Data înființării|data înființării|Data infiintarii)[^<]*>([^<]+)</i,
      "data_inregistrare": /(?:Data înregistrării|data înregistrării|Data inregistrarii)[^<]*>([^<]+)</i,
      "nr_inregistrare": /(?:Nr\.?\s*înregistrare|Nr\.?\s*inregistrare)[^<]*>([^<]+)</i,
      "adresa": /(?:Adresă|Adresa|adresă|adresa)[^<]*>([^<]+)</i,
      "telefon": /(?:Telefon|telefon)[^<]*>([^<]+)</i,
    };

    for (const [key, pattern] of Object.entries(patterns)) {
      const match = html.match(pattern);
      if (match) {
        keySections[key] = match[1] || match[0];
      }
    }

    // Find all table structures
    const tableMatches = html.match(/<table[^>]*>[\s\S]{0,2000}<\/table>/gi);
    const tables = tableMatches ? tableMatches.slice(0, 3) : []; // First 3 tables

    // Find all div structures that might contain data
    const divMatches = html.match(/<div[^>]*class="[^"]*"[^>]*>[\s\S]{0,500}<\/div>/gi);
    const divs = divMatches ? divMatches.slice(0, 5) : []; // First 5 divs

    return NextResponse.json({
      ok: true,
      cui: normalizedCui,
      url: mfinanteUrl,
      htmlLength: html.length,
      keySections,
      tables: tables.map((t, i) => ({
        index: i,
        length: t.length,
        preview: t.substring(0, 300),
      })),
      divs: divs.map((d, i) => ({
        index: i,
        length: d.length,
        preview: d.substring(0, 300),
      })),
      // Return full HTML (be careful with large responses)
      fullHtml: html.length < 50000 ? html : html.substring(0, 50000) + "\n... (truncated)",
      note: html.length >= 50000 
        ? "HTML is large, returning first 50000 characters. Check keySections and patterns for actual structure."
        : "Full HTML returned. Inspect structure to update parsing patterns.",
    });
  } catch (error) {
    console.error("[admin/test-mfinante-html] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
