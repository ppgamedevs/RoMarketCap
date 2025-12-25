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

const SEAPRowSchema = z.object({
  // Common SEAP CSV fields (adjust based on actual format)
  nume_firma: z.string().min(1).optional(),
  denumire: z.string().min(1).optional(),
  nume: z.string().min(1).optional(),
  cui: z.string().min(2),
  valoare: z.coerce.number().optional(),
  valoare_contract: z.coerce.number().optional(),
  valoare_totala: z.coerce.number().optional(),
  an: z.coerce.number().int().optional(),
  an_contract: z.coerce.number().int().optional(),
  autoritate_contractanta: z.string().optional(),
  nume_autoritate: z.string().optional(),
  id_contract: z.string().optional(),
  contract_id: z.string().optional(),
  id: z.string().optional(),
});

type SEAPRow = z.infer<typeof SEAPRowSchema>;

function normalizeSEAPRow(row: SEAPRow): NationalIngestionRow {
  const name = row.nume_firma || row.denumire || row.nume || "";
  const cui = normalizeCUI(row.cui) || row.cui;
  const contractValue = row.valoare || row.valoare_contract || row.valoare_totala || null;
  const contractYear = row.an || row.an_contract || null;
  const contractingAuthority = row.autoritate_contractanta || row.nume_autoritate || null;
  const externalId = row.id_contract || row.contract_id || row.id || null;

  return {
    name: name.trim(),
    cui,
    contractValue,
    contractYear,
    contractingAuthority,
    externalId,
  };
}

async function ingestSEAPFromFile(filePath: string, dryRun = false): Promise<{
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

    Papa.parse(stream, {
      header: true,
      skipEmptyLines: true,
      step: async (result, parser) => {
        rowNumber++;
        stats.processed++;

        try {
          const parsed = SEAPRowSchema.safeParse(result.data);
          if (!parsed.success) {
            stats.errors++;
            stats.errorsList.push({ row: rowNumber, error: `Validation: ${parsed.error.message}` });
            return;
          }

          const normalized = normalizeSEAPRow(parsed.data);
          if (!normalized.cui || !isValidCUI(normalized.cui)) {
            stats.errors++;
            stats.errorsList.push({ row: rowNumber, error: `Invalid CUI: ${normalized.cui}` });
            return;
          }

          if (!dryRun) {
            const result = await processNationalIngestionRow(normalized, "SEAP", result.data as Record<string, unknown>);
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
      error: (error) => {
        reject(error);
      },
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const filePath = args[0];
  const dryRun = args.includes("--dry-run");

  if (!filePath) {
    console.error("Usage: tsx scripts/ingest/seap.ts <file.csv> [--dry-run]");
    process.exit(1);
  }

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const resolvedPath = path.isAbsolute(filePath) ? filePath : path.resolve(__dirname, "../../", filePath);

  console.log(`[SEAP] Reading ${resolvedPath}`);
  console.log(`[SEAP] Dry run: ${dryRun}`);

  try {
    const stats = await ingestSEAPFromFile(resolvedPath, dryRun);
    console.log(`[SEAP] Done:`, stats);
    console.log(`[SEAP] Processed: ${stats.processed}, Created: ${stats.created}, Updated: ${stats.updated}, Errors: ${stats.errors}`);
    if (stats.errorsList.length > 0) {
      console.error(`[SEAP] First 10 errors:`, stats.errorsList.slice(0, 10));
    }
  } catch (error) {
    console.error("[SEAP] Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

