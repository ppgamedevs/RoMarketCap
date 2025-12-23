import { PrismaClient } from "@prisma/client";
import { computeScoreForCompany } from "../../src/lib/scoring/computeScoreForCompany";

const prisma = new PrismaClient();

async function main() {
  const batchSize = 200;
  let cursor: string | undefined = undefined;
  let processed = 0;
  let updated = 0;

  console.log("[score:all] starting");

  while (true) {
    const args: Parameters<typeof prisma.company.findMany>[0] = {
      select: { id: true },
      orderBy: { id: "asc" },
      take: batchSize,
    };
    if (cursor) {
      args.cursor = { id: cursor };
      args.skip = 1;
    }

    const companies = await prisma.company.findMany(args);
    if (companies.length === 0) break;

    for (const c of companies) {
      processed += 1;
      const r = await computeScoreForCompany(c.id);
      if (r) updated += 1;
      if (processed % 100 === 0) console.log(`[score:all] processed=${processed} updated=${updated}`);
    }

    cursor = companies[companies.length - 1]!.id;
  }

  console.log(`[score:all] done processed=${processed} updated=${updated}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


