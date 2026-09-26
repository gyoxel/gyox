import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { importData } from "@/lib/repository";
import { baseExpenseSchema, settingsInputSchema } from "@/lib/validation";

const backupSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string(),
  settings: settingsInputSchema,
  expenses: z.array(
    baseExpenseSchema.extend({
      id: z.string().min(1),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
    }),
  ),
  darets: z
    .array(
      z.object({
        id: z.string().min(1),
        expenseId: z.string().min(1),
        members: z.number().int().min(2),
        turnMonth: z.string().regex(/^\d{4}-\d{2}$/),
        createdAt: z.string(),
      }),
    )
    .optional(),
  categories: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        emoji: z.string().min(1),
        position: z.number().int(),
      }),
    )
    .optional(),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Fichier JSON invalide." }, { status: 400 });
  }

  const parsed = backupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const now = new Date().toISOString();
  await importData({
    ...parsed.data,
    expenses: parsed.data.expenses.map((e) => ({
      ...e,
      endDate: e.endDate ?? null,
      notes: e.notes ?? null,
      creditInitialAmount: e.creditInitialAmount ?? null,
      creditPriorPaid: e.creditPriorPaid ?? null,
      linkedExpenseId: e.linkedExpenseId ?? null,
      createdAt: e.createdAt ?? now,
      updatedAt: e.updatedAt ?? now,
    })),
  });
  return NextResponse.json({ ok: true });
}
