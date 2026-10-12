// Validation of a budget and of a line spent from it.
import { z } from "zod";
import type { BudgetInput } from "./budgets-repo";

export const budgetSchema = z.object({
  name: z.string().trim().min(1, "Indique un nom.").max(60),
  emoji: z
    .string()
    .trim()
    .max(16)
    .nullable()
    .default(null)
    .transform((e) => e || null),
  amount: z.number().positive("Le montant doit être positif.").max(1e9),
  recurrence: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("once") }),
    z.object({ kind: z.literal("monthly") }),
    z.object({ kind: z.literal("months"), months: z.number().int().min(1).max(600) }),
  ]),
});

export const budgetEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().positive("Le montant doit être positif.").max(1e9),
  note: z
    .string()
    .trim()
    .max(80)
    .nullable()
    .default(null)
    .transform((n) => n || null),
  method: z.enum(["cash", "card"]).default("cash"),
});

export const toBudgetInput = (data: z.infer<typeof budgetSchema>): BudgetInput => ({
  ...data,
  amount: Math.round(data.amount * 100) / 100,
});
