"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { Category, Income, PaymentMethod } from "@/lib/types";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { incomeCategory } from "@/lib/income";
import { CategoryPicker } from "@/components/category-picker";
import { todayDateStr } from "@/lib/date";
import { cleanDecimalInput, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { useNavBack } from "@/lib/nav-history";
import { mutate } from "@/lib/use-refresh-data";
import { errorMessage } from "@/components/expense-editor";
import { DeleteButton } from "@/components/delete-button";
import { incomeDelete } from "@/lib/delete-specs";
import { LockedDelete } from "@/components/locked-delete";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categoryName } from "@/lib/i18n";
import { useT } from "@/lib/i18n/client";

/**
 * Ajouter / modifier un revenu (on top of the salary): amount, category
 * (prime, freelance, cadeau…), name, cash or card and a note; dated today. It adds to the money
 * of the month it's received.
 */
export function IncomeEditor({
  income,
  source,
  categories: initialCategories,
}: {
  income?: Income;
  /** The income categories (defaults and the user's own). */
  categories: Category[];
  /** Created by something else (a credit): deleted from there only. */
  source?: { label: string; href: string };
}) {
  const isEdit = income != null;
  const nav = useNavBack();
  const t = useT();
  const [amount, setAmount] = useState(toDecimalInput(income?.amount ?? null));
  const [categories, setCategories] = useState(initialCategories);
  const [category, setCategory] = useState(income?.category ?? initialCategories[0]?.id ?? "autre");
  const [name, setName] = useState(income?.name ?? "");
  const [nameTouched, setNameTouched] = useState(isEdit);
  // Received today (an edit keeps its own date).
  const date = income?.date ?? todayDateStr();
  const [method, setMethod] = useState<PaymentMethod>(income?.method ?? "cash");
  const [notes, setNotes] = useState(income?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const amountValue = parseDecimalInput(amount);
  const selected = incomeCategory(category, categories);
  // Until a name is typed, the category's label is the name.
  const finalName = (nameTouched ? name : name || categoryName(selected.label, t)).trim();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(amountValue > 0)) return setError(t("Indique un montant."));
    if (!finalName) return setError(t("Indique un nom."));
    const body = { name: finalName, amount: amountValue, category, date, method, notes: notes.trim() || null };
    startTransition(async () => {
      const res = await mutate({
        method: isEdit ? "PATCH" : "POST",
        path: isEdit ? `/api/incomes/${income.id}` : "/api/incomes",
        body,
      });
      if (!res.ok) return setError(await errorMessage(res));
      toast.success(isEdit ? t("Revenu modifié.") : t("{amount} ajouté à ton solde.", { amount: `+${formatMoney(amountValue)}` }));
      nav.back("/incomes");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Amount */}
      <div className="relative flex flex-col items-center gap-1 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-600 px-4 py-5 text-white shadow-lg dark:shadow-none">
        <Label htmlFor="amount" className="text-xs text-white/80">
          {t("Montant reçu")}
        </Label>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white/80">+</span>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(cleanDecimalInput(e.target.value))}
            placeholder="0"
            style={{ width: `${Math.max(1, amount.length) + 0.3}ch` }}
            className="max-w-[60vw] bg-transparent text-center text-4xl font-bold text-white outline-none placeholder:text-white/40"
          />
          <span className="text-lg font-semibold text-white/70">DH</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{t("Nom")}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => {
            setNameTouched(true);
            setName(e.target.value);
          }}
          placeholder={categoryName(selected.label, t)}
          maxLength={60}
        />
      </div>

      {/* Category */}
      <div className="flex flex-col gap-2">
        <Label>{t("Catégorie")}</Label>
        <CategoryPicker
          categories={categories}
          value={category}
          onChange={setCategory}
          // (Like the server: before "Autre", which stays last.)
          onCreated={(c) =>
            setCategories((prev) => (prev.at(-1)?.id === "autre" ? [...prev.slice(0, -1), c, prev.at(-1)!] : [...prev, c]))
          }
          endpoint="/api/income-categories"
          placeholder={t("Ex : Location voiture")}
        />
      </div>

      <PaymentMethodPicker value={method} onChange={setMethod} label={t("Reçu en")} />

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">{t("Note (optionnel)")}</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => nav.back("/incomes")}>
          {t("Annuler")}
        </Button>
        <Button type="submit" className="flex-1 gx-cta" disabled={isPending}>
          {isPending ? t("Enregistrement…") : isEdit ? t("Enregistrer") : t("Ajouter le revenu")}
        </Button>
      </div>

      {isEdit && source && (
        <LockedDelete hint={t("Ce revenu vient de {source} : supprime-le depuis", { source: source.label })} href={source.href} linkLabel={t("sa page")} />
      )}

      {isEdit && !source && <DeleteButton variant="full" {...incomeDelete(income, t)} />}
    </form>
  );
}

