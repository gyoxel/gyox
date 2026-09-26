import { z } from "zod";

export const expenseTypeEnum = z.enum(["permanent", "temporary", "credit"]);
export const frequencyEnum = z.enum(["monthly", "one-time"]);
export const colorEnum = z.enum(["blue", "red", "yellow"]);

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const baseExpenseSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis."),
  amount: z.coerce.number().positive("Le montant doit être un nombre positif."),
  type: expenseTypeEnum,
  frequency: frequencyEnum,
  startDate: z.string().regex(dateRegex, "Date de début invalide."),
  endDate: z
    .string()
    .regex(dateRegex, "Date de fin invalide.")
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  active: z.coerce.boolean().default(true),
  color: colorEnum,
  notes: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
  creditInitialAmount: z.coerce
    .number()
    .nonnegative("La dette restante ne peut pas être négative.")
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  creditPriorPaid: z.coerce
    .number()
    .nonnegative("Le montant déjà remboursé ne peut pas être négatif.")
    .nullable()
    .optional()
    .transform((v) => (v ? v : null)),
  linkedExpenseId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
  icon: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v.trim() : null)),
  categoryId: z
    .string()
    .nullable()
    .optional()
    .transform((v) => (v && v.trim() !== "" ? v : null)),
});

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(40, "40 caractères maximum."),
  emoji: z.string().trim().min(1, "Choisis un emoji.").max(16),
});

// Accepts a partial payload for PATCH requests; merge with the existing
// record then re-validate the merged result with expenseInputSchema.
export const partialExpenseSchema = baseExpenseSchema.partial();

export const expenseInputSchema = baseExpenseSchema.superRefine((data, ctx) => {
    if (data.type === "credit") {
      if (data.creditInitialAmount == null || data.creditInitialAmount <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["creditInitialAmount"],
          message: "La dette restante est requise pour un crédit.",
        });
      }
    }

    if (data.type === "credit" && data.linkedExpenseId) {
      ctx.addIssue({
        code: "custom",
        path: ["linkedExpenseId"],
        message: "Un crédit ne peut pas être lié à une autre dépense.",
      });
    }

    if (data.frequency === "one-time" && data.type === "credit") {
      ctx.addIssue({
        code: "custom",
        path: ["frequency"],
        message: "Un crédit est toujours mensuel.",
      });
    }

    if (data.endDate && data.endDate < data.startDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "La date de fin doit être postérieure à la date de début.",
      });
    }

    if (data.linkedExpenseId && data.endDate) {
      ctx.addIssue({
        code: "custom",
        path: ["endDate"],
        message: "Une dépense liée à un crédit ne peut pas avoir sa propre date de fin.",
      });
    }
  });

export type ExpenseFormValues = z.infer<typeof expenseInputSchema>;

export const settingsInputSchema = z.object({
  salary: z.coerce.number().positive("Le salaire doit être un nombre positif."),
  currency: z.string().min(1, "La devise est requise."),
  savingsTarget: z.coerce.number().nonnegative("L'objectif d'épargne ne peut pas être négatif."),
  startMonth: z.string().regex(/^\d{4}-\d{2}$/, "Mois de départ invalide."),
  theme: z.enum(["light", "dark", "system"]),
});

export type SettingsFormValues = z.infer<typeof settingsInputSchema>;
