import { readFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import Papa from "papaparse";
import { PrismaClient } from "@prisma/client";
import { processNationalIngestionRow, type NationalIngestionRow } from "../../src/lib/ingestion/provenance";
import { isValidCUI, normalizeCUI } from "../../src/lib/ingestion/cuiValidation";

const prisma = new PrismaClient();

const EUFundsRowSchema = z.object({
  // Common EU Funds CSV fields (adjust based on actual format)
  nume_beneficiar: z.string().min(1).optional(),
  denumire: z.string().min(1).optional(),
  nume: z.string().min(1).optional(),
  beneficiar: z.string().min(1).optional(),
  cui: z.string().min(2),
  valoare: z.coerce.number().optional(),
  valoare_proiect: z.coerce.number().optional(),
  valoare_totala: z.coerce.number().optional(),
  suma: z.coerce.number().optional(),
  an: z.coerce.number().int().optional(),
  an_proiect: z.coerce.number().int().optional(),
  an_contract: z.coerce.number().int().optional(),
  program: z.string().optional(),
  nume_program: z.string().optional(),
  fond: z.string().optional(),
  id_proiect: z.string().optional(),
  proiect_id: z.string().optional(),
  id: z.string().optional(),
});

type EUFundsRow = z.infer<typeof EUFundsRowSchema>;

function normalizeEUFundsRow(row: EUFundsRow): NationalIngestionRow {
  const name = row.nume_beneficiar || row.denumire || row.nume || row.beneficiar || "";
  const cui = normalizeCUI(row.cui) || row.cui;
  const contractValue = row.valoare || row.valoare_proiect || row.valoare_totala || row.suma || null;
  const contractYear = row.an || row.an_proiect || row.an_contract || null;
  const contractingAuthority = row.program || row.nume_program || row.fond || null;
  const externalId = row.id_proiect || row.proiect_id || row.id || null;

  return {
    name: name.trim(),
    cui,
    contractValue,
    contractYear,
    contractingAuthority,
    externalId,
  };
}

async function ingestEUFundsFromFile(filePath: string, dryRun = false): Promise<{
  processed: number;
  created: number;
  updated: number;
  errors: number;
  errorsList: Array<{ row: number; error: string }>;
}> {
  const stats = {
    processed: 0,
    created: 0,
    updated: 0,
    errors: 0,
    errorsList: [] as Array<{ row: number; error: string }>,
  };

  return new Promise((resolve, reject) => {
    const stream = createReadStream(filePath, { encoding: "utf8" });
    let rowNumber = 0;

    Papa.parse(stream as any, {
      header: true,
      skipEmptyLines: true,
      step: async (result: any, parser: any) => {
        rowNumber++;
        stats.processed++;

        try {
          const parsed = EUFundsRowSchema.safeParse(result.data);
          if (!parsed.success) {
            stats.errors++;
            stats.errorsList.push({ row: rowNumber, error: `Validation: ${parsed.error.message}` });
            return;
          }

          const normalized = normalizeEUFundsRow(parsed.data);
          if (!normalized.cui || !isValidCUI(normalized.cui)) {
            stats.errors++;
            stats.errorsList.push({ row: rowNumber, error: `Invalid CUI: ${normalized.cui}` });
            return;
          }

          if (!dryRun) {
            const result = await processNationalIngestionRow(normalized, "EU_FUNDS", result.data as Record<string, unknown>);
            if (result.created) stats.created++;
            if (result.provenanceUpdated) stats.updated++;
          } else {
            // Dry run - just validate
            stats.created++; // Count as would-be created
          }
        } catch (error) {
          stats.errors++;
          stats.errorsList.push({
            row: rowNumber,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      },
      complete: () => {
        resolve(stats);
      },
      error: (error: any) => {
        reject(error);
      },
    } as any);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0];
  const dryRun = args.includes("--dry-run");

  if (!filePath) {
    console.error("Usage: tsx scripts/ingest/euFunds.ts <file.csv> [--dry-run]");
    process.exit(1);
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(__dirname, "../../", filePath);

  console.log(`[EU_FUNDS] Reading ${resolvedPath}`);
  console.log(`[EU_FUNDS] Dry run: ${dryRun}`);

  try {
    const stats = await ingestEUFundsFromFile(resolvedPath, dryRun);
    console.log(`[EU_FUNDS] Done:`, stats);
    console.log(`[EU_FUNDS] Processed: ${stats.processed}, Created: ${stats.created}, Updated: ${stats.updated}, Errors: ${stats.errors}`);
    if (stats.errorsList.length > 0) {
      console.error(`[EU_FUNDS] First 10 errors:`, stats.errorsList.slice(0, 10));
    }
  } catch (error) {
    console.error("[EU_FUNDS] Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

