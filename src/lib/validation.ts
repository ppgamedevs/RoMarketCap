import { z } from "zod";

export const CompanyCreateInput = z.object({
  name: z.string().min(1).max(200),
  legalName: z.string().min(1).max(300),
  cui: z.string().min(2).max(32),
  regCom: z.string().min(2).max(64).optional(),
  slug: z.string().min(3).max(180).optional(),
  website: z.string().url().optional(),
  domain: z.string().min(1).max(253).optional(),
  city: z.string().min(1).max(120).optional(),
  county: z.string().min(1).max(120).optional(),
  address: z.string().min(1).max(300).optional(),
  foundedYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  employeeCountRangeMin: z.number().int().min(0).optional(),
  employeeCountRangeMax: z.number().int().min(0).optional(),
  descriptionRo: z.string().max(2000).optional(),
  descriptionEn: z.string().max(2000).optional(),
});

export const SnapshotCreateInput = z.object({
  sourceType: z.enum(["GOVERNMENT", "COMMERCIAL", "USER_SUBMITTED"]),
  sourceRef: z.string().min(1).max(500),
  collectedAt: z.coerce.date(),
  rawJson: z.unknown(),
  normalizedJson: z.unknown().optional(),
  checksum: z.string().min(8).max(200),
  metrics: z
    .array(
      z.object({
        periodYear: z.number().int().min(1900).max(2100),
        revenue: z.number().finite().optional(),
        profit: z.number().finite().optional(),
        assets: z.number().finite().optional(),
        liabilities: z.number().finite().optional(),
        employees: z.number().int().min(0).optional(),
        currency: z.string().min(3).max(3),
      }),
    )
    .optional(),
});

export const IngestCompanyInput = z.object({
  company: CompanyCreateInput.pick({
    name: true,
    legalName: true,
    cui: true,
    regCom: true,
    slug: true,
    website: true,
    domain: true,
    city: true,
    county: true,
    address: true,
    foundedYear: true,
    employeeCountRangeMin: true,
    employeeCountRangeMax: true,
    descriptionRo: true,
    descriptionEn: true,
  }),
  snapshot: SnapshotCreateInput,
});

export const ClaimCreateInput = z.object({
  companyId: z.string().uuid(),
  userId: z.string().uuid(),
  roleInCompany: z.string().min(2).max(120),
  proofType: z.enum(["DOCUMENT", "EMAIL", "OTHER"]),
  proofUrl: z.string().url(),
  notes: z.string().max(2000).optional(),
});


