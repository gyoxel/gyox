"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, Clock } from "lucide-react";
import { useNavBack } from "@/lib/nav-history";
import { toast } from "sonner";
import type { Category, Expense, ExpenseType, Frequency, PaymentMethod } from "@/lib/types";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { addMonths, monthKey, monthLabelFr, monthOfDateStr, todayDateStr } from "@/lib/date";
import { lastDayOfMonth } from "@/lib/daret";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { useRefreshData } from "@/lib/use-refresh-data";
import { CategoryPicker } from "@/components/category-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  /** How it was paid, when it is. */
  method: PaymentMethod | null;
  /** "(ce mois-ci)" etc. */
  hint: string;
}

/**
 * After an edit: applies the "Payé / Pas encore" choice and the cash/card
 * method to the period's payment. Returns false when that failed.
 */
export async function syncPaymentStatus(
  expenseId: string,
  status: PaymentStatusInit,
  paid: boolean,
  method: PaymentMethod,
): Promise<boolean> {
  const base = `/api/expenses/${expenseId}/payments`;
  const json = { "Content-Type": "application/json" };
  if (paid !== status.paid) {
    const res = paid
      ? await fetch(base, { method: "POST", headers: json, body: JSON.stringify({ monthKey: status.monthKey, method }) })
      : await fetch(`${base}?monthKey=${status.monthKey}`, { method: "DELETE" });
    return res.ok;
  }
  if (paid && method !== status.method) {
    const res = await fetch(base, { method: "PATCH", headers: json, body: JSON.stringify({ monthKey: status.monthKey, method }) });
    return res.ok;
  }
  return true;
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
  const nav = useNavBack();
  const refreshData = useRefreshData();
  const [categories, setCategories] = useState(initialCategories);

  const [amount, setAmount] = useState(expense ? toDecimalInput(expense.amount) : "");
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
  const [untilTotal, setUntilTotal] = useState(toDecimalInput(recurrenceInit?.until ? Number(recurrenceInit.until) : null));
  // Statut de paiement: "Payé" by default when creating (paid today,
  // deducted from Disponible); "Pas encore" leaves it in Dépenses to check
  // off. A new credit defaults to "Pas encore" (first installment usually
  // still to come). When editing it reflects the current period.
  const [alreadyPaid, setAlreadyPaid] = useState(isEdit ? (paymentStatus?.paid ?? false) : !isCredit);
  const [method, setMethod] = useState<PaymentMethod>(paymentStatus?.method ?? "cash");
  // New entries start today; an edited one keeps its original start date.
  const date = expense?.startDate ?? todayDateStr();
  const [notes, setNotes] = useState(expense?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const amountValue = parseDecimalInput(amount);
  const monthsValue = Math.floor(Number(months) || 0);
  const untilValue = parseDecimalInput(untilTotal);

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
              (recurrenceKind === "until" && untilValue !== (Number(init.until) || 0))));
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

        if (paymentStatus && !(await syncPaymentStatus(expense.id, paymentStatus, alreadyPaid, method))) {
          toast.error("Enregistré, mais le statut de paiement n'a pas pu être mis à jour.");
        }

        await refreshData();
        toast.success("Modifications enregistrées.");
        nav.back();
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
          body: JSON.stringify({ monthKey: monthKey(start), method }),
        });
        if (!paidRes.ok) toast.error("Ajoutée, mais le paiement n'a pas pu être enregistré.");
      }

      await refreshData();
      toast.success(isCredit ? "Crédit ajouté." : "Dépense ajoutée.");
      nav.back();
    });
  }

  const kinds: { key: "once" | RecurrenceKind; emoji: string; label: string; hint: string }[] = [
    { key: "once", emoji: "1️⃣", label: "Une fois", hint: "Ce mois-ci" },
    { key: "permanent", emoji: "🔁", label: "Chaque mois", hint: "Sans fin" },
    { key: "months", emoji: "📅", label: "X mois", hint: "Pendant…" },
    { key: "until", emoji: "🎯", label: "Jusqu'à", hint: "Un total" },
  ];
  function pickKind(key: "once" | RecurrenceKind) {
    if (key === "once") return setRecurring(false);
    setRecurring(true);
    setRecurrenceKind(key);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Amount */}
      <div className="relative flex flex-col items-center gap-1 overflow-hidden rounded-3xl bg-gradient-to-br from-rose-400 via-rose-500 to-pink-700 px-4 py-5 text-white shadow-lg shadow-rose-500/20 dark:shadow-none">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <Label htmlFor="amount" className="relative text-xs text-white/80">
          {recurring ? "Montant par mois" : "Montant"}
        </Label>
        <div className="relative flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white/80">−</span>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(cleanDecimalInput(e.target.value))}
            placeholder="0"
            // Grow with the digits so "DH" stays right next to the number.
            style={{ width: `${Math.max(1, amount.length) + 0.3}ch` }}
            className="max-w-[60vw] bg-transparent text-center text-4xl font-bold text-white outline-none placeholder:text-white/40"
          />
          <span className="text-lg font-semibold text-white/70">DH</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Pizza, Loyer…" />
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

      {/* How often */}
      <div className="flex flex-col gap-2">
        <Label>Fréquence</Label>
        <div role="radiogroup" aria-label="Fréquence" className="grid grid-cols-4 gap-2">
          {kinds.map((k) => {
            const selected = mode === k.key;
            return (
              <button
                key={k.key}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => pickKind(k.key)}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2.5 text-center transition-colors",
                  selected
                    ? "border-rose-500 bg-rose-50 text-rose-800 ring-1 ring-rose-500 dark:bg-rose-950/50 dark:text-rose-200"
                    : "border-slate-200 bg-white text-slate-600 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                )}
              >
                <span className="text-lg leading-none">{k.emoji}</span>
                <span className="text-xs font-semibold">{k.label}</span>
                <span className="text-[10px] text-slate-400">{k.hint}</span>
              </button>
            );
          })}
        </div>
        {mode === "months" && (
          <div className="flex items-center gap-2">
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
              placeholder="Nombre de mois, ex : 6"
              onFocus={(e) => keepAboveKeyboard(e.currentTarget)}
            />
            <span className="shrink-0 text-sm text-slate-500">mois</span>
          </div>
        )}
        {mode === "until" && (
          <div className="flex items-center gap-2">
            <Input
              id="untilTotal"
              aria-label="Montant à atteindre (DH)"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={untilTotal}
              onChange={(e) => setUntilTotal(cleanDecimalInput(e.target.value))}
              placeholder="Total à atteindre, ex : 3000"
              onFocus={(e) => keepAboveKeyboard(e.currentTarget)}
            />
            <span className="shrink-0 text-sm text-slate-500">DH</span>
          </div>
        )}
        {summary && (
          <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{summary}</p>
        )}
      </div>

      {(!isEdit || paymentStatus) && (
        <div className="flex flex-col gap-2">
          <Label>
            Statut de paiement
            {isEdit ? ` ${paymentStatus?.hint ?? ""}` : recurring ? " (1er mois)" : ""}
          </Label>
          <div role="radiogroup" aria-label="Statut de paiement" className="grid grid-cols-2 gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={alreadyPaid}
              onClick={() => setAlreadyPaid(true)}
              className={cn(
                "flex items-center justify-center gap-1.5 rounded-xl border py-3 text-sm font-semibold transition-colors",
                alreadyPaid
                  ? "border-transparent bg-emerald-500 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
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
                "flex items-center justify-center gap-1.5 rounded-xl border py-3 text-sm font-semibold transition-colors",
                !alreadyPaid
                  ? "border-transparent bg-rose-500 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
              )}
            >
              <Clock className="h-4 w-4" />
              Pas encore
            </button>
          </div>
          {alreadyPaid && <PaymentMethodPicker value={method} onChange={setMethod} />}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Note (optionnel)</Label>
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => nav.back()}>
          Annuler
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-rose-600 text-white hover:bg-rose-700 dark:bg-rose-600 dark:text-white"
          disabled={isPending}
        >
          {isPending ? "Enregistrement…" : isEdit ? "Enregistrer" : "Ajouter la dépense"}
        </Button>
      </div>
    </form>
  );
}

/**
 * When one of these fields is tapped, keeps it right above the keyboard.
 *
 * The keyboard shrinks the visible area (interactive-widget=resizes-content;
 * the visual viewport is used too, for browsers that overlay it instead).
 * The browser also scrolls the field into view on its own — often leaving it
 * mid-screen, sometimes after an animation. So for a short while after each
 * keyboard change, every scroll that settles (the browser's) is followed by a
 * re-alignment; our own scroll then settles with nothing left to correct.
 */
const KEYBOARD_GAP_PX = 8;
const SETTLE_MS = 100;
const WATCH_MS = 1200;
let fullHeight = 0; // tallest visible area seen, i.e. without the keyboard
let fullWidth = 0;

function visibleBottom(): number {
  const vv = window.visualViewport;
  return vv ? vv.offsetTop + vv.height : window.innerHeight;
}

export function keepAboveKeyboard(input: HTMLInputElement) {
  const vv = window.visualViewport;
  let settleTimer: ReturnType<typeof setTimeout> | undefined;
  let watchUntil = Date.now() + WATCH_MS;

  function keyboardOpen(): boolean {
    const height = vv?.height ?? window.innerHeight;
    if (window.innerWidth !== fullWidth) fullHeight = 0; // rotated
    fullWidth = window.innerWidth;
    fullHeight = Math.max(fullHeight, height, window.screen.height * 0.7);
    return height < fullHeight - 120;
  }
  function align() {
    if (document.activeElement !== input || !keyboardOpen()) return;
    const delta = input.getBoundingClientRect().bottom + KEYBOARD_GAP_PX - visibleBottom();
    if (Math.abs(delta) > 1) window.scrollBy(0, delta);
  }
  function onScroll() {
    if (Date.now() > watchUntil) return;
    clearTimeout(settleTimer);
    settleTimer = setTimeout(align, SETTLE_MS);
  }
  function onResize() {
    watchUntil = Date.now() + WATCH_MS;
    onScroll();
  }

  vv?.addEventListener("resize", onResize);
  vv?.addEventListener("scroll", onScroll);
  window.addEventListener("resize", onResize);
  window.addEventListener("scroll", onScroll);
  onResize(); // keyboard already open (e.g. coming from another field)
  input.addEventListener(
    "blur",
    () => {
      clearTimeout(settleTimer);
      vv?.removeEventListener("resize", onResize);
      vv?.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
    },
    { once: true },
  );
}

export async function errorMessage(res: Response): Promise<string> {
  const body = await res.json().catch(() => null);
  const first =
    body?.error?.formErrors?.[0] ??
    (body?.error?.fieldErrors && (Object.values(body.error.fieldErrors)[0] as string[] | undefined))?.[0];
  return first ?? "Une erreur est survenue. Vérifiez les champs.";
}
