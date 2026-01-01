/**
 * PROMPT 63: Cleanup Public Sector Entities
 * 
 * Removes public sector entities (schools, hospitals, municipalities, etc.)
 * Keeps only private companies and BVB listed companies.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/db";
import { requireAdminSession } from "@/src/lib/auth/requireAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Patterns that indicate public sector entities
const PUBLIC_SECTOR_PATTERNS = [
  // Educational
  "SCOALA",
  "COLEGIUL",
  "LICEUL",
  "GRADINITA",
  
  // Healthcare
  "SPITAL",
  
  // Government
  "MUNICIPIUL",
  "COMUNA",
  "ORAS",
  "PRIMARIA",
  "CONSILIUL LOCAL",
  "CONSILIUL JUDETEAN",
  
  // Directorates & Services
  "DIRECTIA",
  "ADMINISTRATIA",
  "SERVICIUL PUBLIC",
  "SERVICII LOCALE",
  
  // Centers & Institutions
  "CENTRUL",
  "INSPECTORATUL",
  "BIBLIOTECA",
  "CASA DE CULTURA",
  "PALATUL",
  
  // Social Services
  "ASISTENTA SOCIALA",
  "PROTECTIA COPILULUI",
  "UNITATEA DE ASISTENTA",
  
  // Associations & Public Bodies
  "ASOCIATIA DE DEZVOLTARE",
  "MANAGEMENT INTEGRAT AL DESEURILOR",
  "SALUBRIZARE",
];

function normalizeText(text: string): string {
  return text
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^A-Z0-9\s]/g, ""); // Keep only letters, numbers, spaces
}

function isPublicSectorEntity(name: string): boolean {
  const normalizedName = normalizeText(name);
  return PUBLIC_SECTOR_PATTERNS.some(pattern => {
    const normalizedPattern = normalizeText(pattern);
    return normalizedName.includes(normalizedPattern);
  });
}

export async function GET(req: Request) {
  return POST(req);
}

export async function POST(req: Request) {
  try {
    await requireAdminSession().catch(() => null);

    const { searchParams } = new URL(req.url);
    const dryRun = searchParams.get("dry") === "1";

    const results = {
      total: 0,
      deleted: 0,
      kept: 0,
      publicEntities: [] as string[],
    };

    // Find all companies
    const allCompanies = await prisma.company.findMany({
      select: {
        id: true,
        cui: true,
        name: true,
        isListed: true,
        revenueLatest: true,
      },
    });

    results.total = allCompanies.length;

    for (const company of allCompanies) {
      // Keep if:
      // 1. Listed on BVB
      if (company.isListed) {
        results.kept++;
        continue;
      }

      // 2. Not a public sector entity
      if (!isPublicSectorEntity(company.name)) {
        results.kept++;
        continue;
      }

      // Delete public sector entity
      results.deleted++;
      results.publicEntities.push(company.name);

      if (!dryRun) {
        await prisma.company.delete({
          where: { id: company.id },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      message: dryRun 
        ? `DRY RUN: Would delete ${results.deleted} public entities, keep ${results.kept} companies`
        : `Deleted ${results.deleted} public entities, kept ${results.kept} companies`,
      dryRun,
      results: {
        total: results.total,
        deleted: results.deleted,
        kept: results.kept,
        sampleDeleted: results.publicEntities.slice(0, 20),
      },
    });

  } catch (error) {
    console.error("[admin/cleanup-public-entities] Error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
