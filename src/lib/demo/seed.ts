import { prisma } from "@/src/lib/db";
import { slugifyCompanyName } from "@/src/lib/slug";

const DEMO_COMPANIES = [
  {
    name: "Demo Company 001",
    legalName: "Demo Company 001 SRL",
    cui: "12345678",
    county: "București",
    countySlug: "bucuresti",
    city: "București",
    industry: "IT",
    industrySlug: "it",
    caenCode: "6201",
    caenDescription: "Activități de creare a software-ului",
    romcScore: 75,
    romcConfidence: 85,
    romcAiScore: 72,
    employees: 50,
    revenueLatest: 5000000,
    profitLatest: 500000,
    currency: "RON",
  },
  {
    name: "Demo Company 002",
    legalName: "Demo Company 002 SRL",
    cui: "12345679",
    county: "Cluj",
    countySlug: "cluj",
    city: "Cluj-Napoca",
    industry: "IT",
    industrySlug: "it",
    caenCode: "6201",
    caenDescription: "Activități de creare a software-ului",
    romcScore: 68,
    romcConfidence: 80,
    romcAiScore: 65,
    employees: 30,
    revenueLatest: 3000000,
    profitLatest: 300000,
    currency: "RON",
  },
  {
    name: "Demo Company 003",
    legalName: "Demo Company 003 SRL",
    cui: "12345680",
    county: "Timiș",
    countySlug: "timis",
    city: "Timișoara",
    industry: "Manufacturing",
    industrySlug: "manufacturing",
    caenCode: "2511",
    caenDescription: "Fabricarea structurilor metalice",
    romcScore: 55,
    romcConfidence: 70,
    romcAiScore: 52,
    employees: 100,
    revenueLatest: 10000000,
    profitLatest: 800000,
    currency: "RON",
  },
  {
    name: "Demo Company 004",
    legalName: "Demo Company 004 SRL",
    cui: "12345681",
    county: "Iași",
    countySlug: "iasi",
    city: "Iași",
    industry: "Services",
    industrySlug: "services",
    caenCode: "7022",
    caenDescription: "Activități de consultanță pentru management",
    romcScore: 62,
    romcConfidence: 75,
    romcAiScore: 60,
    employees: 25,
    revenueLatest: 2000000,
    profitLatest: 200000,
    currency: "RON",
  },
  {
    name: "Demo Company 005",
    legalName: "Demo Company 005 SRL",
    cui: "12345682",
    county: "Constanța",
    countySlug: "constanta",
    city: "Constanța",
    industry: "Retail",
    industrySlug: "retail",
    caenCode: "4711",
    caenDescription: "Comerț cu amănuntul cu deschidere generală",
    romcScore: 48,
    romcConfidence: 65,
    romcAiScore: 45,
    employees: 15,
    revenueLatest: 1500000,
    profitLatest: 100000,
    currency: "RON",
  },
];

export async function seedDemoCompanies(): Promise<{ created: number; skipped: number }> {
  // Check if any companies exist (non-demo)
  const existingCount = await prisma.company.count({ where: { isDemo: false } });
  if (existingCount > 0) {
    return { created: 0, skipped: DEMO_COMPANIES.length };
  }

  let created = 0;
  for (const demo of DEMO_COMPANIES) {
    const slug = slugifyCompanyName(demo.name);
    try {
      await prisma.company.create({
        data: {
          slug,
          name: demo.name,
          legalName: demo.legalName,
          cui: demo.cui,
          county: demo.county,
          countySlug: demo.countySlug,
          city: demo.city,
          industry: demo.industry,
          industrySlug: demo.industrySlug,
          caenCode: demo.caenCode,
          caenDescription: demo.caenDescription,
          romcScore: demo.romcScore,
          romcConfidence: demo.romcConfidence,
          romcAiScore: demo.romcAiScore,
          employees: demo.employees,
          revenueLatest: demo.revenueLatest,
          profitLatest: demo.profitLatest,
          currency: demo.currency,
          isDemo: true,
          isPublic: true,
          visibilityStatus: "PUBLIC",
        },
      });
      created += 1;
    } catch (error) {
      console.error(`[demo:seed] Failed to create ${demo.name}:`, error);
    }
  }

  return { created, skipped: DEMO_COMPANIES.length - created };
}

export async function clearDemoCompanies(): Promise<{ deleted: number }> {
  const result = await prisma.company.deleteMany({
    where: { isDemo: true },
  });
  return { deleted: result.count };
}
