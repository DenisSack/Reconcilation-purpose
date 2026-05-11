import { z } from "zod";

export const problemTypeSchema = z.enum([
  "Manquant fournisseur",
  "Manquant système",
  "Montants différents",
]);

export type ProblemType = z.infer<typeof problemTypeSchema>;

export const discrepancySchema = z.object({
  reference: z.string(),
  supplierAmount: z.number().nullable(),
  systemAmount: z.number().nullable(),
  difference: z.number(),
  problem: problemTypeSchema,
});

export const reconciliationSaveSchema = z.object({
  serviceId: z.string().min(1),
  supplierCount: z.number().int().nonnegative(),
  systemCount: z.number().int().nonnegative(),
  totalSupplier: z.number(),
  totalSystem: z.number(),
  difference: z.number(),
  discrepancies: z.array(discrepancySchema),
});

export const adminUserSchema = z.object({
  id: z.string().optional(),
  username: z.string().min(2, "Minimum 2 caractères"),
  password: z.string().optional(),
  role: z.enum(["ADMIN", "USER"]),
  canAccessStatus: z.boolean(),
  serviceIds: z.array(z.string()),
});

export const adminServiceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nom requis"),
  description: z.string().optional().nullable(),
});

export const auditFilterSchema = z.object({
  action: z.string().optional(),
  userId: z.string().optional(),
});
