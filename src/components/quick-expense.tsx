"use client";

import { useState, useTransition } from "react";
import { Lightning } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import type { Category, PaymentMethod } from "@/lib/types";
import { QUICK_COOKIE } from "@/lib/quick-expense";
import { budgetLevel } from "@/lib/category-budgets";
import { todayDateStr } from "@/lib/date";
import { insufficientMessage } from "@/lib/balance-message";
import { useNavBack } from "@/lib/nav-history";
import { mutate } from "@/lib/use-refresh-data";
import { categoryName, localName } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { CategoryPicker } from "@/components/category-picker";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { BudgetBar, LEVEL_TEXT } from "@/components/budget-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Dépense rapide: how much, which category, cash or card — a one-time
 * expense paid today, in one tap. The category and the account start on
 * the last ones used here; a category with a budget shows where it gets to.
 */
export function QuickExpense({
  categories: initial,
  spent,
  balance,
  currency,
  lastCategoryId,
  lastMethod,
}: {
  categories: Category[];
  /** Category id → spent this month. */
  spent: Record<string, number>;
  balance: Record<PaymentMethod, number>;
  currency: string;
  lastCategoryId: string | null;
  lastMethod: PaymentMethod;
}) {
  const t = useT();
  const nav = useNavBack();
  const [categories, setCategories] = useState(initial);
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(
    lastCategoryId && initial.some((c) => c.id === lastCategoryId) ? lastCategoryId : null,
  );
  const [method, setMethod] = useState<PaymentMethod>(lastMethod);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const value = parseDecimalInput(amount);
  const money = (n: number) => formatMoney(n, currency);
  const picked = categories.find((c) => c.id === categoryId) ?? null;
  const budget = picked?.budget ?? 0;
  const before = picked ? (spent[picked.id] ?? 0) : 0;
  const after = Math.round((before + Math.max(0, value)) * 100) / 100;

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(value > 0)) return setError(t("Indique un montant."));
    if (categories.length > 0 && !picked) return setError(t("Choisis une catégorie."));
    if (value > balance[method] + 0.005) return setError(insufficientMessage(method, balance[method], t));
    const name = note.trim() || picked?.name || "Dépense";
    const today = todayDateStr();
    startTransition(async () => {
      const res = await mutate({
        method: "POST",
        path: "/api/expenses",
        body: {
          name,
          amount: value,
          startDate: today,
          active: true,
          notes: null,
          creditPriorPaid: null,
          icon: null,
          categoryId: picked?.id ?? null,
          type: "temporary",
          frequency: "one-time",
          endDate: null,
          color: "yellow",
          creditInitialAmount: null,
          linkedExpenseId: null,
          // Paid in the same request: one round trip.
          paid: { monthKey: today.slice(0, 7), method },
        },
      });
      if (!res.ok) return setError(await errorMessage(res));
      const created: { problems?: string[] } = await res.json();
      if (created.problems?.includes("paid")) toast.error(t("Ajoutée, mais le paiement n'a pas pu être enregistré."));
      else toast.success(t("{name} : {amount} payés.", { name: localName(name, t), amount: money(value) }));
      // Next time, the same category and account to start with.
      document.cookie = `${QUICK_COOKIE}=${picked?.id ?? ""}|${method}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      nav.back("/");
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="relative flex flex-col items-center gap-1 overflow-hidden rounded-3xl bg-gradient-to-br from-rose-500 to-pink-700 px-4 py-5 text-white shadow-lg shadow-rose-500/20 dark:shadow-none">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <Label htmlFor="amount" className="relative flex items-center gap-1 text-xs text-white/80">
          <Lightning weight="fill" className="h-3.5 w-3.5" />
          {t("Combien ?")}
        </Label>
        <div className="relative flex items-baseline gap-2">
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(cleanDecimalInput(e.target.value))}
            placeholder="0"
            style={{ width: `${Math.max(1, amount.length) + 0.3}ch` }}
            className="max-w-[60vw] bg-transparent text-center text-5xl font-bold text-white outline-none placeholder:text-white/40"
          />
          <span className="text-lg font-semibold text-white/70">{currency === "MAD" ? "DH" : currency}</span>
        </div>
        <p className="relative text-[11px] text-white/80">{t("Payée aujourd'hui")}</p>
      </div>

      {categories.length > 0 && (
        <div className="flex flex-col gap-2">
          <Label>{t("Catégorie")}</Label>
          <CategoryPicker categories={categories} value={categoryId} onChange={setCategoryId} onCreated={(c) => setCategories((prev) => [...prev, c])} />
        </div>
      )}

      {picked && budget > 0 && (
        <div className="flex flex-col gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">
              {t("Budget")} · {picked.emoji} {categoryName(picked.name, t)}
            </span>
            <span className={cn("shrink-0 font-semibold tabular-nums", LEVEL_TEXT[budgetLevel(after, budget)])}>
              {money(after)} / {money(budget)}
            </span>
          </p>
          <BudgetBar spent={after} budget={budget} />
        </div>
      )}

      <PaymentMethodPicker value={method} onChange={setMethod} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">{t("Pour quoi ? (optionnel)")}</Label>
        <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={60} placeholder={t("Ex : Taxi, café, Marjane…")} />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Button type="submit" className="gx-cta h-12 text-base" disabled={pending}>
        <Lightning weight="fill" className="h-4 w-4" />
        {pending ? t("Enregistrement…") : value > 0 ? t("Ajouter · {amount}", { amount: money(value) }) : t("Ajouter")}
      </Button>
      <p className="-mt-2 px-1 text-center text-[11px] text-slate-400">
        {t("Payée aujourd'hui : elle sort de ton solde et s'ajoute à tes dépenses du mois.")}
      </p>
    </form>
  );
}
