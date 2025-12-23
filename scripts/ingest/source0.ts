import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import { slugifyCompanyName } from "../../src/lib/slug";

const prisma = new PrismaClient();

const SeedCompanySchema = z.object({
  name: z.string().min(1),
  cui: z.string().min(2),
  county: z.string().optional(),
  city: z.string().optional(),
  caen: z.string().optional(),
  website: z.string().url().optional(),
});

const SeedFileSchema = z.array(SeedCompanySchema).min(1);

function stableSlug(name: string): string {
  return slugifyCompanyName(name);
}

async function main() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const seedPath = path.resolve(__dirname, "../../data/seeds/companies.seed.json");

  console.log(`[source0] reading ${seedPath}`);
  const raw = await readFile(seedPath, "utf8");
  const json = JSON.parse(raw) as unknown;

  const parsed = SeedFileSchema.safeParse(json);
  if (!parsed.success) {
    console.error(parsed.error.flatten());
    process.exit(1);
  }

  const run = await prisma.importRun.create({
    data: { source: "source0", status: "RUNNING", statsJson: { started: new Date().toISOString() } },
  });

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of parsed.data) {
    const externalId = item.cui;
    try {
      const existing = await prisma.company.findUnique({ where: { cui: item.cui } });

      let slug = stableSlug(item.name);
      if (!slug) slug = `company-${item.cui.toLowerCase()}`;

      // Ensure slug uniqueness deterministically: fallback to suffixing CUI if needed.
      const slugConflict = await prisma.company.findUnique({ where: { slug } });
      if (slugConflict && slugConflict.cui !== item.cui) {
        slug = `${slug}-${item.cui.toLowerCase()}`;
      }

      if (!existing) {
        await prisma.company.create({
          data: {
            slug,
            name: item.name,
            legalName: item.name,
            cui: item.cui,
            county: item.county ?? null,
            city: item.city ?? null,
            caen: item.caen ?? null,
            caenCode: item.caen ?? null,
            website: item.website ?? null,
            sourceConfidence: 60,
            isPublic: true,
            visibilityStatus: "PUBLIC",
            isActive: true,
          },
        });
        created += 1;

        await prisma.importItem.create({
          data: {
            importRunId: run.id,
            externalId,
            companyCui: item.cui,
            status: "CREATED",
            rawJson: item,
          },
        });
        continue;
      }

      const next = {
        slug,
        name: item.name,
        legalName: existing.legalName || item.name,
        county: item.county ?? existing.county,
        city: item.city ?? existing.city,
        caen: item.caen ?? existing.caen,
        caenCode: item.caen ?? existing.caenCode,
        website: item.website ?? existing.website,
      };

      const changed =
        existing.slug !== next.slug ||
        existing.name !== next.name ||
        existing.county !== next.county ||
        existing.city !== next.city ||
        existing.caen !== next.caen ||
        existing.website !== next.website;

      if (!changed) {
        skipped += 1;
        await prisma.importItem.create({
          data: {
            importRunId: run.id,
            externalId,
            companyCui: item.cui,
            status: "SKIPPED",
            rawJson: item,
          },
        });
        continue;
      }

      await prisma.company.update({
        where: { id: existing.id },
        data: {
          slug: next.slug,
          name: next.name,
          county: next.county ?? null,
          city: next.city ?? null,
          caen: next.caen ?? null,
          caenCode: next.caenCode ?? null,
          website: next.website ?? null,
        },
      });
      updated += 1;

      await prisma.importItem.create({
        data: {
          importRunId: run.id,
          externalId,
          companyCui: item.cui,
          status: "UPDATED",
          rawJson: item,
        },
      });
    } catch (err) {
      failed += 1;
      await prisma.importItem.create({
        data: {
          importRunId: run.id,
          externalId,
          companyCui: item.cui,
          status: "FAILED",
          error: err instanceof Error ? err.message : "Unknown error",
          rawJson: item,
        },
      });
    }
  }

  const stats = { created, updated, skipped, failed, total: parsed.data.length };
  const status: "SUCCESS" | "FAILED" = failed > 0 ? "FAILED" : "SUCCESS";
  await prisma.importRun.update({
    where: { id: run.id },
    data: { status, finishedAt: new Date(), statsJson: stats },
  });

  console.log(`[source0] done`, stats);

  if (failed > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


