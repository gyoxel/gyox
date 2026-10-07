"use client";

import { useState, useTransition } from "react";
import { Check, Clock } from "lucide-react";
import { toast } from "sonner";
import { useNavBack } from "@/lib/nav-history";
import { mutate } from "@/lib/use-refresh-data";
import { addMonths, monthLabelFr, monthOfDateStr, monthsBetween, todayMonth } from "@/lib/date";
import type { BudgetWithExpense, PaymentMethod } from "@/lib/types";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { DeleteButton } from "@/components/delete-button";
import { budgetDelete } from "@/lib/delete-specs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMOJIS = ["🚌", "🚕", "⛽", "🍔", "🛒", "☕", "🚬", "📱", "🎉", "👕", "💊", "🧾"];

type Kind = "once" | "monthly" | "months";

const KINDS: { key: Kind; emoji: string; label: string; hint: string }[] = [
  { key: "once", emoji: "1️⃣", label: "Une fois", hint: "Ce mois-ci" },
  { key: "monthly", emoji: "🔁", label: "Chaque mois", hint: "Sans fin" },
  { key: "months", emoji: "📅", label: "X mois", hint: "Pendant…" },
];

/** The recurrence the form opens on for an existing budget. */
function initialKind(budget?: BudgetWithExpense): { kind: Kind; months: string } {
  const e = budget?.expense;
  if (!e || e.type === "permanent") return { kind: "monthly", months: "" };
  if (e.frequency === "one-time" || !e.endDate) return { kind: "once", months: "" };
  return { kind: "months", months: String(monthsBetween(monthOfDateStr(e.startDate), monthOfDateStr(e.endDate)) + 1) };
}

/**
 * Ajouter / modifier un budget: the amount on top, the name and emoji, how
 * long it runs (like an expense), and — when adding — whether it's taken
 * now (the amount leaves the Solde).
 */
export function BudgetForm({ currency, budget }: { currency: string; budget?: BudgetWithExpense }) {
  const isEdit = budget != null;
  const nav = useNavBack();
  const init = initialKind(budget);
  const [amount, setAmount] = useState(toDecimalInput(budget?.expense.amount ?? null));
  const [name, setName] = useState(budget?.expense.name ?? "");
  const [emoji, setEmoji] = useState(budget?.expense.icon ?? "🚌");
  const [kind, setKind] = useState<Kind>(init.kind);
  const [months, setMonths] = useState(init.months);
  const [taken, setTaken] = useState(true);
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const money = (n: number) => formatMoney(n, currency);
  const amountValue = parseDecimalInput(amount);
  const monthsValue = Math.floor(Number(months) || 0);
  const start = budget ? monthOfDateStr(budget.expense.startDate) : todayMonth();
  const emojis = EMOJIS.includes(emoji) || !emoji ? EMOJIS : [emoji, ...EMOJIS.slice(0, -1)];

  const summary =
    kind === "monthly"
      ? "Chaque mois, sans fin : il revient le mois suivant."
      : kind === "months" && monthsValue > 0
        ? `${monthsValue} mois · jusqu'à ${monthLabelFr(addMonths(start, monthsValue - 1)).toLowerCase()}`
        : kind === "once"
          ? `Juste ${monthLabelFr(start).toLowerCase()}.`
          : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(amountValue > 0)) return setError("Indique le montant du budget.");
    if (!name.trim()) return setError("Indique un nom.");
    if (kind === "months" && (monthsValue < 1 || monthsValue > 600)) return setError("Indique le nombre de mois.");
    const recurrence = kind === "months" ? { kind, months: monthsValue } : { kind };
    startTransition(async () => {
      const res = await mutate({
        method: isEdit ? "PATCH" : "POST",
        path: isEdit ? `/api/budgets/${budget.id}` : "/api/budgets",
        body: {
          name: name.trim(),
          emoji,
          amount: amountValue,
          recurrence,
          ...(!isEdit && taken ? { paid: { method } } : {}),
        },
      });
      if (!res.ok) return setError(await errorMessage(res));
      if (!isEdit) {
        const created: { problems?: string[] } = await res.json();
        if (created.problems?.includes("paid")) toast.error("Budget ajouté, mais pas pris : solde insuffisant.");
      }
      toast.success(isEdit ? "Budget modifié." : "Budget ajouté.");
      nav.back("/budgets");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-400 via-purple-500 to-violet-700 px-4 pb-4 pt-5 text-white shadow-lg shadow-purple-500/20 dark:shadow-none">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <Label htmlFor="amount" className="relative block text-center text-xs text-white/80">
          {emoji} Budget {kind === "once" ? "" : "par mois"}
        </Label>
        <div className="relative mt-1 flex items-baseline justify-center gap-2">
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
          <span className="text-lg font-semibold text-white/70">{currency === "MAD" ? "DH" : currency}</span>
        </div>
        <p className="relative mt-2 text-center text-[11px] text-white/85">
          Pris en une fois, puis tu notes chaque jour ce que tu en dépenses.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Transport" maxLength={60} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Emoji</Label>
        <div role="radiogroup" aria-label="Emoji" className="grid grid-cols-6 gap-2">
          {emojis.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={emoji === e}
              aria-label={e}
              onClick={() => setEmoji(e)}
              className={cn(
                "flex h-11 items-center justify-center rounded-xl border text-xl transition-colors",
                emoji === e
                  ? "border-purple-500 bg-purple-50 ring-1 ring-purple-500 dark:bg-purple-950/50"
                  : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
              )}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Durée</Label>
        <div role="radiogroup" aria-label="Durée" className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => (
            <button
              key={k.key}
              type="button"
              role="radio"
              aria-checked={kind === k.key}
              onClick={() => setKind(k.key)}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2.5 transition-colors",
                kind === k.key
                  ? "border-transparent bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-md shadow-purple-500/25"
                  : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
              )}
            >
              <span className="text-lg">{k.emoji}</span>
              <span className="text-xs font-semibold">{k.label}</span>
              <span className={cn("text-[10px]", kind === k.key ? "text-white/80" : "text-slate-400")}>{k.hint}</span>
            </button>
          ))}
        </div>
        {kind === "months" && (
          <div className="flex items-center gap-2">
            <Input
              aria-label="Nombre de mois"
              type="text"
              inputMode="numeric"
              value={months}
              onChange={(e) => setMonths(e.target.value.replace(/\D/g, "").slice(0, 3))}
              placeholder="Nombre de mois, ex : 6"
            />
            <span className="shrink-0 text-sm text-slate-500">mois</span>
          </div>
        )}
        {summary && (
          <p className="rounded-xl bg-purple-50 px-3 py-2 text-xs text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
            {summary}
            {amountValue > 0 && kind !== "once" && <> · {money(amountValue)} par mois</>}
          </p>
        )}
      </div>

      {!isEdit && (
        <div className="flex flex-col gap-2">
          <Label>Ce mois-ci</Label>
          <div role="radiogroup" aria-label="Ce mois-ci" className="grid grid-cols-2 gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={taken}
              onClick={() => setTaken(true)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl border py-3 text-sm font-semibold transition-colors",
                taken
                  ? "border-transparent bg-emerald-500 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
              )}
            >
              <Check className="h-4 w-4" />
              Pris
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={!taken}
              onClick={() => setTaken(false)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl border py-3 text-sm font-semibold transition-colors",
                !taken
                  ? "border-transparent bg-rose-500 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
              )}
            >
              <Clock className="h-4 w-4" />
              Pas encore
            </button>
          </div>
          {taken ? (
            <PaymentMethodPicker value={method} onChange={setMethod} label="Pris en" />
          ) : (
            <p className="px-1 text-[11px] text-slate-400">Il t&apos;attend dans tes dépenses du mois : coche-le quand tu le prends.</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => nav.back("/budgets")}>
          Annuler
        </Button>
        <Button type="submit" className="flex-1 bg-purple-600 text-white hover:bg-purple-700" disabled={isPending}>
          {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter le budget"}
        </Button>
      </div>

      {isEdit && <DeleteButton variant="full" {...budgetDelete(budget)} />}
    </form>
  );
}
