"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Category } from "@/lib/types";
import { budgetDelete } from "@/lib/delete-specs";
import { budgetLevel, budgetPercent } from "@/lib/category-budgets";
import { useNavBack } from "@/lib/nav-history";
import { mutate } from "@/lib/use-refresh-data";
import { categoryName } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { CategoryPicker } from "@/components/category-picker";
import { DeleteButton } from "@/components/delete-button";
import { BudgetBar, LEVEL_TEXT } from "@/components/budget-bar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * A category's budget: the most to spend in it a month. New (`category`
 * left out): pick the category, preselected from ?category=; else that
 * category's, which can be changed or removed. Beside it, what's spent in
 * it the month shown and the month before, to choose the amount.
 */
export function BudgetForm({
  categories: initial,
  category: fixed,
  preselected,
  spent,
  previous,
  spentLabel,
  previousLabel,
  currency,
}: {
  categories: Category[];
  /** Editing this category's budget. */
  category?: Category;
  preselected?: string | null;
  /** Category id → spent in the month shown / the month before. */
  spent: Record<string, number>;
  previous: Record<string, number>;
  /** "Ce mois-ci", or the month's name. */
  spentLabel: string;
  previousLabel: string;
  currency: string;
}) {
  const t = useT();
  const nav = useNavBack();
  const [categories, setCategories] = useState(initial);
  const [categoryId, setCategoryId] = useState<string | null>(fixed?.id ?? preselected ?? null);
  const picked = categories.find((c) => c.id === categoryId) ?? null;
  const [amount, setAmount] = useState(fixed?.budget ? toDecimalInput(fixed.budget) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const value = parseDecimalInput(amount);
  const money = (n: number) => formatMoney(n, currency);
  const now = categoryId ? (spent[categoryId] ?? 0) : 0;
  const before = categoryId ? (previous[categoryId] ?? 0) : 0;
  const replaces = !fixed && picked?.budget ? picked.budget : null;

  function pick(id: string) {
    setCategoryId(id);
    // One that already has a budget: start from it.
    const budget = categories.find((c) => c.id === id)?.budget;
    if (budget) setAmount(toDecimalInput(budget));
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!categoryId) return setError(t("Choisis une catégorie."));
    if (!(value > 0)) return setError(t("Indique un montant."));
    startTransition(async () => {
      const res = await mutate({ method: "PUT", path: `/api/categories/${categoryId}/budget`, body: { amount: value } });
      if (!res.ok) return setError(await errorMessage(res));
      toast.success(t("Budget enregistré."));
      nav.back("/budgets");
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="relative flex flex-col items-center gap-1 overflow-hidden rounded-3xl bg-gradient-to-br from-violet-500 via-indigo-600 to-indigo-800 px-4 py-5 text-white shadow-lg shadow-indigo-600/20 dark:shadow-none">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <Label htmlFor="amount" className="relative text-xs text-white/80">
          {picked ? `${picked.emoji} ${categoryName(picked.name, t)} · ${t("par mois")}` : t("Maximum par mois")}
        </Label>
        <div className="relative flex items-baseline gap-2">
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(cleanDecimalInput(e.target.value))}
            placeholder="0"
            autoFocus={!!fixed || !!preselected}
            style={{ width: `${Math.max(1, amount.length) + 0.3}ch` }}
            className="max-w-[60vw] bg-transparent text-center text-4xl font-bold text-white outline-none placeholder:text-white/40"
          />
          <span className="text-lg font-semibold text-white/70">{currency === "MAD" ? "DH" : currency}</span>
        </div>
      </div>

      {!fixed && (
        <div className="flex flex-col gap-2">
          <Label>{t("Catégorie")}</Label>
          <CategoryPicker categories={categories} value={categoryId} onChange={pick} onCreated={(c) => setCategories((prev) => [...prev, c])} />
        </div>
      )}

      {categoryId && (
        <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="flex items-center justify-between gap-2">
            <span className="text-slate-500 dark:text-slate-400">{spentLabel}</span>
            <span className={cn("font-semibold tabular-nums", value > 0 ? LEVEL_TEXT[budgetLevel(now, value)] : "text-slate-900 dark:text-white")}>
              {money(now)}
              {value > 0 && <> / {money(value)} · {budgetPercent(now, value)}%</>}
            </span>
          </p>
          {value > 0 && <BudgetBar spent={now} budget={value} />}
          <p className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span>{previousLabel}</span>
            <span className="tabular-nums">{money(before)}</span>
          </p>
        </div>
      )}

      <p className="px-1 text-[11px] text-slate-400">
        {replaces
          ? t("Cette catégorie a déjà un budget de {amount} : il sera remplacé.", { amount: money(replaces) })
          : t("Rien ne sort de ton solde : tes dépenses de cette catégorie s'additionnent chaque mois et la barre passe à l'orange à 80 %, au rouge si tu dépasses.")}
      </p>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => nav.back("/budgets")}>
          {t("Annuler")}
        </Button>
        <Button type="submit" className="flex-1 gx-cta" disabled={pending}>
          {pending ? t("Enregistrement…") : t("Enregistrer")}
        </Button>
      </div>

      {fixed && <DeleteButton variant="full" {...budgetDelete(fixed, t)} />}
    </form>
  );
}
