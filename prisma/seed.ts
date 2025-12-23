import { Prisma, PrismaClient } from "@prisma/client";
import { scoreCompanyV0 } from "../src/lib/scoring/scoreCompany";

const prisma = new PrismaClient();

type SeedCompany = {
  slug: string;
  name: string;
  legalName: string;
  tradeName?: string | null;
  cui?: string | null;
  registrationNumber?: string | null;
  county?: string | null;
  city?: string | null;
  address?: string | null;
  industry?: string | null;
  website?: string | null;
  domain?: string | null;
  descriptionRo?: string | null;
  descriptionEn?: string | null;
  foundedYear?: number | null;
  employeeCountEstimate?: number | null;
  caenCode?: string | null;
  caenDescription?: string | null;
};

async function main() {
  // 20 deterministic, realistic-ish Romanian company examples (fake identifiers).
  const companies: SeedCompany[] = [
    {
      slug: "bitdefender-srl",
      name: "Bitdefender",
      legalName: "BITDEFENDER SRL",
      tradeName: "Bitdefender",
      cui: "RO12345678",
      registrationNumber: "J40/1234/2001",
      county: "București",
      city: "București",
      industry: "Cybersecurity",
      website: "https://www.bitdefender.com",
      domain: "bitdefender.com",
      descriptionRo: "Profil informativ. Estimările sunt orientative.",
      descriptionEn: "Informational profile. Estimates are indicative.",
      foundedYear: 2001,
      employeeCountEstimate: 1500,
      caenCode: "6201",
      caenDescription: "Activități de realizare a soft-ului la comandă",
    },
    { slug: "emag-srl", name: "eMAG", legalName: "EMAG SRL", cui: "RO23456789", county: "Ilfov", city: "Voluntari", industry: "E-commerce", website: "https://www.emag.ro", domain: "emag.ro" },
    { slug: "dedeman-srl", name: "Dedeman", legalName: "DEDEMAN SRL", cui: "RO34567890", county: "Bacău", city: "Bacău", industry: "Retail", website: "https://www.dedeman.ro", domain: "dedeman.ro" },
    { slug: "altex-romania-srl", name: "Altex Romania", legalName: "ALTEX ROMANIA SRL", cui: "RO45678901", county: "București", city: "București", industry: "Retail", website: "https://altex.ro", domain: "altex.ro" },
    { slug: "mobexpert-srl", name: "Mobexpert", legalName: "MOBEXPERT SRL", cui: "RO56789012", county: "București", city: "București", industry: "Furniture", website: "https://mobexpert.ro", domain: "mobexpert.ro" },
    { slug: "banca-transilvania-sa", name: "Banca Transilvania", legalName: "BANCA TRANSILVANIA SA", cui: "RO67890123", county: "Cluj", city: "Cluj-Napoca", industry: "Banking", website: "https://www.bancatransilvania.ro", domain: "bancatransilvania.ro" },
    { slug: "omv-petrom-sa", name: "OMV Petrom", legalName: "OMV PETROM SA", cui: "RO78901234", county: "București", city: "București", industry: "Energy", website: "https://www.omvpetrom.com", domain: "omvpetrom.com" },
    { slug: "hidroelectrica-sa", name: "Hidroelectrica", legalName: "HIDROELECTRICA SA", cui: "RO89012345", county: "București", city: "București", industry: "Energy", website: "https://www.hidroelectrica.ro", domain: "hidroelectrica.ro" },
    { slug: "medlife-sa", name: "MedLife", legalName: "MEDLIFE SA", cui: "RO90123456", county: "București", city: "București", industry: "Healthcare", website: "https://www.medlife.ro", domain: "medlife.ro" },
    { slug: "regina-maria-srl", name: "Regina Maria", legalName: "REGINA MARIA SRL", cui: "RO11223344", county: "București", city: "București", industry: "Healthcare", website: "https://www.reginamaria.ro", domain: "reginamaria.ro" },
    { slug: "fan-courier-express-srl", name: "FAN Courier", legalName: "FAN COURIER EXPRESS SRL", cui: "RO22334455", county: "Ilfov", city: "Ștefăneștii de Jos", industry: "Logistics", website: "https://www.fancourier.ro", domain: "fancourier.ro" },
    { slug: "sameday-courier-srl", name: "Sameday", legalName: "SAMEDAY COURIER SRL", cui: "RO33445566", county: "Ilfov", city: "Chiajna", industry: "Logistics", website: "https://sameday.ro", domain: "sameday.ro" },
    { slug: "continental-automotive-romania-srl", name: "Continental Romania", legalName: "CONTINENTAL AUTOMOTIVE ROMANIA SRL", cui: "RO44556677", county: "Timiș", city: "Timișoara", industry: "Automotive", website: "https://www.continental.com", domain: "continental.com" },
    { slug: "autonom-services-srl", name: "Autonom", legalName: "AUTONOM SERVICES SRL", cui: "RO55667788", county: "Neamț", city: "Piatra Neamț", industry: "Mobility", website: "https://www.autonom.com", domain: "autonom.com" },
    { slug: "ui-path-ro-srl", name: "UiPath Romania", legalName: "UIPATH RO SRL", cui: "RO66778899", county: "București", city: "București", industry: "Enterprise Software", website: "https://www.uipath.com", domain: "uipath.com" },
    { slug: "orange-romania-sa", name: "Orange Romania", legalName: "ORANGE ROMANIA SA", cui: "RO77889900", county: "București", city: "București", industry: "Telecom", website: "https://www.orange.ro", domain: "orange.ro" },
    { slug: "digi-romania-sa", name: "Digi Romania", legalName: "DIGI ROMANIA SA", cui: "RO88990011", county: "București", city: "București", industry: "Telecom", website: "https://www.digi.ro", domain: "digi.ro" },
    { slug: "transilvania-foods-srl", name: "Transilvania Foods", legalName: "TRANSILVANIA FOODS SRL", cui: "RO99001122", county: "Brașov", city: "Brașov", industry: "Food", website: "https://transilvaniafoods.ro", domain: "transilvaniafoods.ro" },
    { slug: "danube-logistics-srl", name: "Danube Logistics", legalName: "DANUBE LOGISTICS SRL", cui: "RO10111213", county: "Constanța", city: "Constanța", industry: "Logistics", website: "https://danubelogistics.ro", domain: "danubelogistics.ro" },
    { slug: "carpathia-software-srl", name: "Carpathia Software", legalName: "CARPATHIA SOFTWARE SRL", cui: null, county: "Cluj", city: "Cluj-Napoca", industry: "Software", website: "https://carpathiasoftware.ro", domain: "carpathiasoftware.ro" },
  ];

  const t0 = new Date("2025-01-01T00:00:00Z");
  const asOfDate = new Date(Date.UTC(t0.getUTCFullYear(), t0.getUTCMonth(), t0.getUTCDate()));

  for (let i = 0; i < companies.length; i++) {
    const c = companies[i]!;
    const company = await prisma.company.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        legalName: c.legalName,
        tradeName: c.tradeName ?? null,
        cui: c.cui ?? null,
        registrationNumber: c.registrationNumber ?? null,
        county: c.county ?? null,
        city: c.city ?? null,
        address: c.address ?? null,
        industry: c.industry ?? null,
        website: c.website ?? null,
        domain: c.domain ?? null,
        descriptionRo: c.descriptionRo ?? null,
        descriptionEn: c.descriptionEn ?? null,
        foundedYear: c.foundedYear ?? null,
        employeeCountEstimate: c.employeeCountEstimate ?? null,
        caenCode: c.caenCode ?? null,
        caenDescription: c.caenDescription ?? null,
      },
      create: {
        slug: c.slug,
        name: c.name,
        legalName: c.legalName,
        tradeName: c.tradeName ?? null,
        cui: c.cui ?? null,
        registrationNumber: c.registrationNumber ?? null,
        country: "RO",
        county: c.county ?? null,
        city: c.city ?? null,
        address: c.address ?? null,
        foundedYear: c.foundedYear ?? null,
        employeeCountEstimate: c.employeeCountEstimate ?? null,
        caenCode: c.caenCode ?? null,
        caenDescription: c.caenDescription ?? null,
        industry: c.industry ?? null,
        website: c.website ?? null,
        domain: c.domain ?? null,
        isActive: true,
        isClaimed: false,
        visibilityStatus: "PUBLIC",
        descriptionRo: c.descriptionRo ?? null,
        descriptionEn: c.descriptionEn ?? null,
        sourceConfidence: 60,
        isPublic: true,
      },
    });

    await prisma.companyFinancialSnapshot.upsert({
      where: {
        companyId_fiscalYear_dataSource: {
          companyId: company.id,
          fiscalYear: 2023,
          dataSource: "ESTIMATE",
        },
      },
      update: {},
      create: {
        companyId: company.id,
        fiscalYear: 2023,
        currency: "RON",
        revenue: 10_000_000 + i * 500_000,
        profit: 1_000_000 + i * 50_000,
        expenses: 8_000_000 + i * 400_000,
        assets: 12_000_000 + i * 600_000,
        liabilities: 4_000_000 + i * 200_000,
        equity: 8_000_000 + i * 400_000,
        dataSource: "ESTIMATE",
        confidenceScore: 55,
      },
    });

    await prisma.companyScore.upsert({
      where: {
        companyId_scoreType_calculatedAt_scoreVersion: {
          companyId: company.id,
          scoreType: "ROMC_SCORE",
          calculatedAt: t0,
          scoreVersion: "romc-v0.1",
        },
      },
      update: {},
      create: {
        companyId: company.id,
        scoreType: "ROMC_SCORE",
        scoreValue: 60 + (i % 35),
        scoreVersion: "romc-v0.1",
        explanation: "Seed placeholder score; methodology will be implemented later.",
        calculatedAt: t0,
      },
    });

    await prisma.companyValuationEstimate.upsert({
      where: {
        companyId_calculatedAt_modelVersion: {
          companyId: company.id,
          calculatedAt: t0,
          modelVersion: "valuation-v0.1",
        },
      },
      update: {},
      create: {
        companyId: company.id,
        valuationMin: 20_000_000 + i * 1_000_000,
        valuationMax: 60_000_000 + i * 2_000_000,
        valuationCurrency: "EUR",
        modelVersion: "valuation-v0.1",
        confidence: 55,
        methodologySummary: "Seed placeholder range; not financial advice.",
        calculatedAt: t0,
      },
    });

    // Prompt 7: latest metrics snapshot + daily scoring history (v0)
    const metrics = await prisma.companyMetrics.upsert({
      where: { companyId: company.id },
      update: {
        employeesCount: company.employeeCountEstimate,
        revenueLastYear: 10_000_000 + i * 500_000,
        profitLastYear: 1_000_000 + i * 50_000,
        seapContractsCount: (i % 3) * 5,
        seapContractsValue: (i % 3) * 2_000_000,
        linkedinFollowers: 500 + i * 200,
        linkedinGrowth90d: 0.05 + (i % 10) * 0.08,
        websiteTrafficMonthly: 10_000 + i * 5000,
        mentions30d: 2 + (i % 20),
        fundingSignals: i % 7 === 0 ? 1 : 0,
      },
      create: {
        companyId: company.id,
        employeesCount: company.employeeCountEstimate,
        revenueLastYear: 10_000_000 + i * 500_000,
        profitLastYear: 1_000_000 + i * 50_000,
        seapContractsCount: (i % 3) * 5,
        seapContractsValue: (i % 3) * 2_000_000,
        linkedinFollowers: 500 + i * 200,
        linkedinGrowth90d: 0.05 + (i % 10) * 0.08,
        websiteTrafficMonthly: 10_000 + i * 5000,
        mentions30d: 2 + (i % 20),
        fundingSignals: i % 7 === 0 ? 1 : 0,
      },
    });

    const scored = scoreCompanyV0({
      company: { id: company.id, slug: company.slug, name: company.name, website: company.website },
      metrics,
      now: t0,
    });

    await prisma.companyScoreSnapshot.upsert({
      where: { companyId_asOfDate: { companyId: company.id, asOfDate } },
      update: {
        romcScore: scored.romcScore,
        romcAiScore: scored.romcAiScore,
        confidence: scored.confidence,
        componentsJson: scored.components as Prisma.InputJsonValue,
      },
      create: {
        companyId: company.id,
        asOfDate,
        romcScore: scored.romcScore,
        romcAiScore: scored.romcAiScore,
        confidence: scored.confidence,
        componentsJson: scored.components as Prisma.InputJsonValue,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });


