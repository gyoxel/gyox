"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Category, Expense, ExpenseType, Frequency } from "@/lib/types";
import { addMonths, monthKey, monthLabelFr, monthOfDateStr, todayDateStr } from "@/lib/date";
import { lastDayOfMonth } from "@/lib/daret";
import { cn, formatMoney } from "@/lib/utils";
import { useRefreshData } from "@/lib/use-refresh-data";
import { CategoryPicker } from "@/components/category-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const MAX_MONTHS = 600;

export type RecurrenceKind = "months" | "until" | "permanent";

/** Initial recurrence as shown when editing (computed on the server). */
export interface RecurrenceInit {
  recurring: boolean;
  kind: RecurrenceKind;
  months: string;
  until: string;
}

/** Payment status of the relevant period when editing: this month for
 *  recurring expenses, the expense's own month for a one-time one. */
export interface PaymentStatusInit {
  monthKey: string;
  paid: boolean;
  /** "(ce mois-ci)" etc. */
  hint: string;
}

/**
 * "Ajouter une dépense" and the edit page share this form. The recurrence
 * settings map onto the existing expense model, so every calculation keeps
 * working unchanged:
 * - not recurring                 -> one-time temporary expense
 * - recurring for N months        -> monthly temporary expense ending after N months
 * - recurring until reaching X DH -> credit (monthly installments until X is repaid)
 * - recurring with no limit       -> permanent expense
 */
export function ExpenseEditor({
  categories: initialCategories,
  preset,
  expense,
  recurrenceInit,
  paymentStatus,
}: {
  categories: Category[];
  preset?: "credit";
  /** Present when editing. */
  expense?: Expense;
  recurrenceInit?: RecurrenceInit;
  /** Edit only; null when there's no period to pay right now. */
  paymentStatus?: PaymentStatusInit | null;
}) {
  const isEdit = expense != null;
  const router = useRouter();
  const refreshData = useRefreshData();
  const [categories, setCategories] = useState(initialCategories);

  const [amount, setAmount] = useState(expense ? String(expense.amount) : "");
  const [name, setName] = useState(expense?.name ?? "");
  // Credits have their own entry point (+ > Crédit), so they aren't filed
  // under a category.
  const isCredit = isEdit ? expense.type === "credit" : preset === "credit";
  const [categoryId, setCategoryId] = useState<string | null>(expense?.categoryId ?? null);
  const [recurring, setRecurring] = useState(recurrenceInit?.recurring ?? isCredit);
  // Exactly one recurrence option is active at a time.
  const [recurrenceKind, setRecurrenceKind] = useState<RecurrenceKind>(
    recurrenceInit?.kind ?? (isCredit ? "until" : "months"),
  );
  const [months, setMonths] = useState(recurrenceInit?.months ?? "");
  const [untilTotal, setUntilTotal] = useState(recurrenceInit?.until ?? "");
  // Statut de paiement: "Payé" by default when creating (paid today,
  // deducted from Disponible); "Pas encore" leaves it in Dépenses to check
  // off. A new credit defaults to "Pas encore" (first installment usually
  // still to come). When editing it reflects the current period.
  const [alreadyPaid, setAlreadyPaid] = useState(isEdit ? (paymentStatus?.paid ?? false) : !isCredit);
  // New entries start today; an edited one keeps its original start date.
  const date = expense?.startDate ?? todayDateStr();
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const amountValue = Number(amount) || 0;
  const monthsValue = Math.floor(Number(months) || 0);
  const untilValue = Number(untilTotal) || 0;

  const mode: "once" | "months" | "until" | "permanent" = recurring ? recurrenceKind : "once";

  const summary = useMemo(() => {
    if (!recurring || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    const start = monthOfDateStr(date);
    if (mode === "permanent") return "Permanent : chaque mois, sans fin.";
    if (amountValue <= 0) return null;
    if (mode === "months") {
      if (monthsValue <= 0) return null;
      const end = addMonths(start, monthsValue - 1);
      return `${formatMoney(amountValue)} × ${monthsValue} mois = ${formatMoney(amountValue * monthsValue)} · fin ${monthLabelFr(end)}`;
    }
    if (untilValue <= 0) return null;
    const count = Math.ceil(untilValue / amountValue);
    const last = Math.round((untilValue - (count - 1) * amountValue) * 100) / 100;
    const end = addMonths(start, count - 1);
    return `${count} mois · fin ${monthLabelFr(end)}${last !== amountValue ? ` · dernier versement ${formatMoney(last)}` : ""}`;
  }, [recurring, date, mode, amountValue, monthsValue, untilValue]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (amountValue <= 0) return setError("Indique un montant.");
    if (!name.trim()) return setError("Indique un nom.");
    if (!isEdit && !isCredit && categories.length > 0 && !categoryId) return setError("Choisis une catégorie.");
    if (mode === "months" && monthsValue < 1) return setError("Indique le nombre de mois.");
    if (mode === "months" && monthsValue > MAX_MONTHS) return setError(`${MAX_MONTHS} mois maximum.`);
    if (mode === "until" && untilValue <= 0) return setError("Indique le montant à atteindre.");

    const start = monthOfDateStr(date);
    let type: ExpenseType = "temporary";
    let frequency: Frequency = "one-time";
    let color: "red" | "blue" | "yellow" = "yellow";
    let endDate: string | null = null;
    let creditInitialAmount: number | null = null;

    if (mode === "months" && monthsValue > 1) {
      frequency = "monthly";
      endDate = lastDayOfMonth(addMonths(start, monthsValue - 1));
    } else if (mode === "until") {
      type = "credit";
      frequency = "monthly";
      color = "blue";
      creditInitialAmount = untilValue;
    } else if (mode === "permanent") {
      type = "permanent";
      frequency = "monthly";
      color = "red";
    }

    const recurrenceFields = {
      type,
      frequency,
      endDate,
      color,
      creditInitialAmount,
      linkedExpenseId: null,
    };

    startTransition(async () => {
      if (isEdit) {
        // Only rewrite the recurrence when it was actually changed, so
        // settings this form doesn't show (a link like "ends with Dnya",
        // an amount already repaid before tracking…) are preserved.
        const init = recurrenceInit;
        const recurrenceChanged =
          !init ||
          recurring !== init.recurring ||
          (recurring &&
            (recurrenceKind !== init.kind ||
              (recurrenceKind === "months" && months !== init.months) ||
              (recurrenceKind === "until" && untilTotal !== init.until)));
        const res = await fetch(`/api/expenses/${expense.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            amount: amountValue,
            notes: notes.trim() || null,
            categoryId,
            ...(recurrenceChanged ? recurrenceFields : {}),
          }),
        });
        if (!res.ok) return setError(await errorMessage(res));

        if (paymentStatus && alreadyPaid !== paymentStatus.paid) {
          const payRes = alreadyPaid
            ? await fetch(`/api/expenses/${expense.id}/payments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ monthKey: paymentStatus.monthKey }),
              })
            : await fetch(`/api/expenses/${expense.id}/payments?monthKey=${paymentStatus.monthKey}`, {
                method: "DELETE",
              });
          if (!payRes.ok) toast.error("Enregistré, mais le statut de paiement n'a pas pu être mis à jour.");
        }

        await refreshData();
        toast.success("Modifications enregistrées.");
        router.back();
        return;
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          amount: amountValue,
          startDate: date,
          active: true,
          notes: notes.trim() || null,
          creditPriorPaid: null,
          icon: null,
          categoryId,
          ...recurrenceFields,
        }),
      });
      if (!res.ok) return setError(await errorMessage(res));
      const created: { id: string } = await res.json();

      if (alreadyPaid) {
        const paidRes = await fetch(`/api/expenses/${created.id}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ monthKey: monthKey(start) }),
        });
        if (!paidRes.ok) toast.error("Ajoutée, mais le paiement n'a pas pu être enregistré.");
      }

      await refreshData();
      toast.success(isCredit ? "Crédit ajouté." : "Dépense ajoutée.");
      router.push("/");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-1 rounded-2xl bg-white px-4 py-5 shadow-sm dark:bg-slate-900">
        <Label htmlFor="amount" className="text-xs text-slate-500">
          {recurring ? "Montant par mois" : "Montant"}
        </Label>
        <div className="flex items-baseline gap-2">
          <input
            id="amount"
            type="number"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            // Grow with the digits so "DH" stays right next to the number.
            style={{ width: `${Math.max(1, amount.length) + 0.3}ch` }}
            className="max-w-[70vw] [appearance:textfield] bg-transparent text-center text-4xl font-bold text-slate-900 outline-none placeholder:text-slate-300 dark:text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-lg font-semibold text-slate-400">DH</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Pizza, Loyer…" />
      </div>

      {(isEdit || !isCredit) && (
        <div className="flex flex-col gap-2">
          <Label>Catégorie</Label>
          <CategoryPicker
            categories={categories}
            value={categoryId}
            onChange={setCategoryId}
            onCreated={(c) => setCategories((prev) => [...prev, c])}
          />
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-3.5 dark:border-slate-800">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="recurring" className="text-sm font-medium text-slate-800 dark:text-slate-200">
            Récurrent (+1 mois)
          </label>
          <Switch id="recurring" checked={recurring} onCheckedChange={setRecurring} />
        </div>

        {recurring && (
          <>
            <RecurrenceOption
              label="Nombre de mois"
              selected={recurrenceKind === "months"}
              onSelect={() => setRecurrenceKind("months")}
            >
              <Input
                id="months"
                aria-label="Nombre de mois"
                type="number"
                inputMode="numeric"
                min="1"
                max={MAX_MONTHS}
                step="1"
                value={months}
                onChange={(e) => setMonths(e.target.value)}
                placeholder="Ex: 6"
                onFocus={(e) => keepAboveKeyboard(e.currentTarget)}
                tabIndex={recurrenceKind === "months" ? 0 : -1}
                className="shadow-none"
              />
            </RecurrenceOption>
            <RecurrenceOption
              label="Jusqu'à atteindre"
              selected={recurrenceKind === "until"}
              onSelect={() => setRecurrenceKind("until")}
            >
              <Input
                id="untilTotal"
                aria-label="Montant à atteindre (DH)"
                type="number"
                inputMode="decimal"
                min="0.01"
                step="0.01"
                value={untilTotal}
                onChange={(e) => setUntilTotal(e.target.value)}
                placeholder="Ex: 3000 DH"
                onFocus={(e) => keepAboveKeyboard(e.currentTarget)}
                tabIndex={recurrenceKind === "until" ? 0 : -1}
                className="shadow-none"
              />
            </RecurrenceOption>
            <RecurrenceOption
              label="Permanent (sans fin)"
              selected={recurrenceKind === "permanent"}
              onSelect={() => setRecurrenceKind("permanent")}
            />
            {summary && <p className="text-xs text-[#007261] dark:text-teal-300">{summary}</p>}
          </>
        )}
      </div>

      {(!isEdit || paymentStatus) && (
        <div className="flex flex-col gap-1.5">
          <Label>
            Statut de paiement
            {isEdit ? ` ${paymentStatus?.hint ?? ""}` : recurring ? " (1er mois)" : ""}
          </Label>
          <div
            role="radiogroup"
            aria-label="Statut de paiement"
            className="flex overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
          >
            <button
              type="button"
              role="radio"
              aria-checked={alreadyPaid}
              onClick={() => setAlreadyPaid(true)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors duration-200",
                alreadyPaid ? "bg-emerald-500 text-white" : "bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400",
              )}
            >
              <Check className="h-4 w-4" />
              Payé
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={!alreadyPaid}
              onClick={() => setAlreadyPaid(false)}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors duration-200",
                !alreadyPaid ? "bg-rose-500 text-white" : "bg-white text-slate-500 dark:bg-slate-900 dark:text-slate-400",
              )}
            >
              <Clock className="h-4 w-4" />
              Pas encore
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Note (optionnel)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
          Annuler
        </Button>
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}

/**
 * When one of these fields is tapped and the keyboard opens, places the page
 * so the field sits right above the keyboard, instead of wherever the browser
 * leaves it (hidden, or in the middle of the screen). Waits until both the
 * keyboard (visual viewport resizes) and the browser's own scrolling have
 * settled, then scrolls in one go, and re-checks once in case the browser
 * moved it again.
 */
const KEYBOARD_GAP_PX = 10;
const SETTLE_MS = 180;

function keepAboveKeyboard(input: HTMLInputElement) {
  const viewport = window.visualViewport;
  const startedAt = Date.now();
  let timer = setTimeout(place, 450); // no resize: keyboard already open, or none

  function settle() {
    clearTimeout(timer);
    // Give up waiting after a while so it can never keep postponing.
    timer = setTimeout(place, Date.now() - startedAt > 1500 ? 0 : SETTLE_MS);
  }
  function stopListening() {
    viewport?.removeEventListener("resize", settle);
    viewport?.removeEventListener("scroll", settle);
    window.removeEventListener("scroll", settle);
  }
  function align() {
    if (document.activeElement !== input) return;
    // Bottom of the visible area = top of the keyboard.
    const visibleBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
    const delta = input.getBoundingClientRect().bottom + KEYBOARD_GAP_PX - visibleBottom;
    if (Math.abs(delta) > 1) window.scrollBy(0, delta);
  }
  function place() {
    stopListening();
    align();
    setTimeout(align, 300);
  }

  viewport?.addEventListener("resize", settle);
  viewport?.addEventListener("scroll", settle);
  window.addEventListener("scroll", settle);
}

/** One recurrence choice. When selected it turns green and, if it has an
 *  input, slides to the left half while the input opens on the right. */
function RecurrenceOption({
  label,
  selected,
  onSelect,
  children,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
  children?: React.ReactNode;
}) {
  const expanded = selected && children != null;
  return (
    <div className="flex items-stretch">
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className={cn(
          "flex h-11 shrink-0 items-center justify-center rounded-xl border px-3 text-sm font-medium whitespace-nowrap transition-all duration-300 ease-out",
          selected
            ? "border-[#019c86] bg-[#019c86] text-white shadow-sm"
            : "border-slate-200 bg-white text-slate-600 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
          expanded ? "w-[calc(50%-0.25rem)]" : "w-full",
        )}
      >
        {label}
      </button>
      {children != null && (
        <div
          aria-hidden={!expanded}
          className={cn(
            "overflow-hidden transition-all duration-300 ease-out",
            expanded ? "ml-2 w-[calc(50%-0.25rem)] opacity-100" : "ml-0 w-0 opacity-0",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

async function errorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  const first =
    body?.error?.formErrors?.[0] ??
    (body?.error?.fieldErrors && (Object.values(body.error.fieldErrors)[0] as string[] | undefined))?.[0];
  return first ?? "Une erreur est survenue. Vérifiez les champs.";
}
