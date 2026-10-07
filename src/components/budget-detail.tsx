"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { BudgetEntry, BudgetWithExpense, PaymentMethod } from "@/lib/types";
import type { BudgetMonthState } from "@/lib/budgets";
import { lastDayOfMonth } from "@/lib/daret";
import { addMonths, monthLabelFr, parseMonthKey } from "@/lib/date";
import { METHOD_META } from "@/lib/payment-method";
import { mutate } from "@/lib/use-refresh-data";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { errorMessage, keepAboveKeyboard } from "@/components/expense-editor";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const DAY_FMT = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" });
const dayLabel = (date: string) => DAY_FMT.format(new Date(`${date}T12:00:00`));

/**
 * A budget's month: how much is left (or gone past), whether it's taken,
 * a line to note what was spent, and the month's lines by day. Spent past
 * the budget, the line asks how it's paid (it's a real expense then).
 */
export function BudgetDetail({
  budget,
  state,
  entries,
  today,
  currentMonthKey,
  overflowExpenseId,
  resteIncomeId,
  currency,
}: {
  budget: BudgetWithExpense;
  state: BudgetMonthState;
  /** The month's lines, oldest first. */
  entries: BudgetEntry[];
  today: string;
  currentMonthKey: string;
  overflowExpenseId: string | null;
  resteIncomeId: string | null;
  currency: string;
}) {
  const money = (n: number) => formatMoney(n, currency);
  const key = state.monthKey;
  const label = monthLabelFr(parseMonthKey(key));
  const first = `${key}-01`;
  const last = lastDayOfMonth(parseMonthKey(key));
  const defaultDate = today.startsWith(key) ? today : key < currentMonthKey ? last : first;
  const runs = state.amount > 0;
  const name = budget.expense.name;
  const pct = state.amount > 0 ? Math.min(100, Math.round((state.spent / state.amount) * 100)) : 100;
  const [editing, setEditing] = useState<BudgetEntry | null>(null);

  // What part of each line went past the budget (in the order spent).
  let running = 0;
  const overPart = new Map<string, number>();
  for (const e of entries) {
    const before = running;
    running += e.amount;
    overPart.set(e.id, Math.round(Math.max(0, Math.min(e.amount, running - Math.max(state.amount, before))) * 100) / 100);
  }
  const days = [...new Set(entries.map((e) => e.date))].sort().reverse();

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-fuchsia-400 via-purple-500 to-violet-700 px-5 pb-4 pt-5 text-white shadow-lg shadow-purple-500/20 dark:shadow-none">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <p className="relative text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80">
          {budget.expense.icon ?? "👛"} {name} · {money(state.amount)}
        </p>
        <p className={cn("relative mt-1 text-4xl font-bold tabular-nums", state.over > 0 && "text-rose-100")}>
          {state.over > 0 ? `+${money(state.over)}` : money(state.left)}
        </p>
        <p className="relative text-xs text-white/85">
          {state.over > 0 ? "dépassé" : "reste"} · {money(state.spent)} dépensés sur {money(state.amount)}
        </p>
        <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/20">
          <div className={cn("h-full rounded-full", state.over > 0 ? "bg-rose-300" : "bg-white")} style={{ width: `${pct}%` }} />
        </div>
        <p className="relative mt-2 text-[11px] text-white/85">
          {state.taken
            ? `✓ Pris${state.takenMethod ? ` · ${METHOD_META[state.takenMethod].emoji} ${METHOD_META[state.takenMethod].label}` : ""}`
            : runs
              ? "Pas encore pris"
              : "Ce budget ne court pas ce mois-là."}
        </p>
      </div>

      {!state.taken && runs && key === currentMonthKey && <TakeBudget expenseId={budget.expenseId} monthKey={key} amount={money(state.amount)} />}

      {(state.over > 0 || (state.closed && state.reste > 0)) && (
        <div className="flex flex-col gap-2">
          {state.over > 0 && (
            <SourceLink
              href={overflowExpenseId ? `/expenses/${overflowExpenseId}` : null}
              tone="rose"
              text={`Dépassé de ${money(state.over)} : dans tes dépenses comme « ${name} + »`}
            />
          )}
          {state.closed && state.reste > 0 && (
            <SourceLink
              href={resteIncomeId ? `/incomes/${resteIncomeId}` : null}
              tone="emerald"
              text={`Reste ${money(state.reste)} : revenu « ${name} - Reste » le 1er ${monthLabelFr(addMonths(parseMonthKey(key), 1)).toLowerCase()}`}
            />
          )}
        </div>
      )}

      {(runs || state.taken) && (
        <AddLine budgetId={budget.id} state={state} defaultDate={defaultDate} min={first} max={last} money={money} name={name} />
      )}

      <section className="flex flex-col gap-2">
        <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          Dépenses de <span className="lowercase">{label}</span>
        </h2>
        {days.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-700">
            Rien noté pour l&apos;instant.
          </p>
        ) : (
          <ul className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {days.map((day) => {
              const list = entries.filter((e) => e.date === day).reverse();
              const total = list.reduce((s, e) => s + e.amount, 0);
              return (
                <li key={day} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                  <p className="flex items-center justify-between bg-slate-50 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                    <span className="capitalize">{dayLabel(day)}</span>
                    <span className="tabular-nums normal-case tracking-normal">{money(total)}</span>
                  </p>
                  {list.map((e) => {
                    const over = overPart.get(e.id) ?? 0;
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => setEditing(e)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left active:bg-slate-50 dark:active:bg-slate-800/60"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-800 dark:text-slate-100">{e.note || "Dépense"}</span>
                        {over > 0 && (
                          <span className="shrink-0 rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            +{money(over)} {METHOD_META[e.method].emoji}
                          </span>
                        )}
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{money(e.amount)}</span>
                      </button>
                    );
                  })}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Link
        href={`/budgets/${budget.id}/edit`}
        className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      >
        Modifier le budget
      </Link>

      {editing && (
        <EditLine
          key={editing.id}
          budgetId={budget.id}
          entry={editing}
          min={first}
          max={last}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function SourceLink({ href, tone, text }: { href: string | null; tone: "rose" | "emerald"; text: string }) {
  const cls = cn(
    "flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium",
    tone === "rose"
      ? "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
      : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  );
  if (!href) return <p className={cls}>{text}</p>;
  return (
    <Link href={href} className={cls}>
      <span className="flex-1">{text}</span>
      <ChevronRight className="h-4 w-4 shrink-0 opacity-60" />
    </Link>
  );
}

/** "Prendre le budget": this month's amount leaves the Solde (its tick in Dépenses). */
function TakeBudget({ expenseId, monthKey, amount }: { expenseId: string; monthKey: string; amount: string }) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  function take() {
    setError(null);
    startTransition(async () => {
      const res = await mutate({ method: "POST", path: `/api/expenses/${expenseId}/payments`, body: { monthKey, method } });
      if (!res.ok) return setError(await errorMessage(res));
      toast.success("Budget pris.");
    });
  }
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/20">
      <p className="text-xs text-amber-800 dark:text-amber-200">
        Pas encore pris ce mois-ci. Pris, ses {amount} sortent de ton solde en une fois (comme le cocher dans tes dépenses).
      </p>
      <PaymentMethodPicker value={method} onChange={setMethod} label="Pris en" />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="button" className="bg-purple-600 text-white hover:bg-purple-700" disabled={pending} onClick={take}>
        {pending ? "…" : `Prendre ${amount}`}
      </Button>
    </div>
  );
}

/** Note a line: amount, what for, the day; how it's paid once past the budget. */
function AddLine({
  budgetId,
  state,
  defaultDate,
  min,
  max,
  money,
  name,
}: {
  budgetId: string;
  state: BudgetMonthState;
  defaultDate: string;
  min: string;
  max: string;
  money: (n: number) => string;
  name: string;
}) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [method, setMethod] = useState<PaymentMethod>(state.overMethod);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const value = parseDecimalInput(amount);
  const goesOver = value > 0 ? Math.round(Math.max(0, Math.min(value, state.spent + value - Math.max(state.amount, state.spent))) * 100) / 100 : 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(value > 0)) return setError("Indique combien tu as dépensé.");
    startTransition(async () => {
      const res = await mutate({
        method: "POST",
        path: `/api/budgets/${budgetId}/entries`,
        body: { amount: value, note: note.trim() || null, date, method },
      });
      if (!res.ok) return setError(await errorMessage(res));
      setAmount("");
      setNote("");
      toast.success(goesOver > 0 ? `Noté · +${money(goesOver)} dans tes dépenses.` : "Noté.");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Noter une dépense</h2>
      <div className="flex gap-2">
        <Input
          aria-label="Montant dépensé (DH)"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={amount}
          onChange={(e) => setAmount(cleanDecimalInput(e.target.value))}
          placeholder="Montant"
          onFocus={(e) => keepAboveKeyboard(e.currentTarget)}
          className="w-32 shrink-0 text-base font-semibold"
        />
        <Input aria-label="Pour quoi" value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder="Pour quoi : taxi, bus…" />
      </div>
      <div className="flex items-center gap-3">
        <Label htmlFor="line-date" className="shrink-0 text-sm">
          Le
        </Label>
        <Input id="line-date" type="date" value={date} min={min} max={max} onChange={(e) => setDate(e.target.value || defaultDate)} />
      </div>
      {goesOver > 0 && (
        <div className="flex flex-col gap-2 rounded-xl bg-rose-50 p-3 dark:bg-rose-950/30">
          <p className="text-xs text-rose-700 dark:text-rose-300">
            Ça dépasse le budget : <b>+{money(goesOver)}</b> s&apos;ajoutent à « {name} + » dans tes dépenses.
          </p>
          <PaymentMethodPicker value={method} onChange={setMethod} />
        </div>
      )}
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" className="bg-purple-600 text-white hover:bg-purple-700" disabled={pending || !(value > 0)}>
        <Plus className="h-4 w-4" />
        {pending ? "Enregistrement…" : "Ajouter"}
      </Button>
    </form>
  );
}

/** Change or delete a line. */
function EditLine({
  budgetId,
  entry,
  min,
  max,
  onClose,
}: {
  budgetId: string;
  entry: BudgetEntry;
  min: string;
  max: string;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(toDecimalInput(entry.amount));
  const [note, setNote] = useState(entry.note ?? "");
  const [date, setDate] = useState(entry.date);
  const [method, setMethod] = useState<PaymentMethod>(entry.method);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const value = parseDecimalInput(amount);
  const path = `/api/budgets/${budgetId}/entries/${entry.id}`;

  function run(call: Parameters<typeof mutate>[0], done: string) {
    setError(null);
    startTransition(async () => {
      const res = await mutate(call);
      if (!res.ok) return setError(await errorMessage(res));
      toast.success(done);
      onClose();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la dépense</DialogTitle>
          <DialogDescription>{dayLabel(entry.date)}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!(value > 0)) return setError("Indique un montant.");
            run({ method: "PATCH", path, body: { amount: value, note: note.trim() || null, date, method } }, "Modifié.");
          }}
        >
          <Input
            aria-label="Montant (DH)"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(cleanDecimalInput(e.target.value))}
          />
          <Input aria-label="Pour quoi" value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} placeholder="Pour quoi" />
          <Input aria-label="Date" type="date" value={date} min={min} max={max} onChange={(e) => setDate(e.target.value || entry.date)} />
          <PaymentMethodPicker value={method} onChange={setMethod} label="Si ça dépasse" />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="bg-purple-600 text-white hover:bg-purple-700" disabled={pending}>
            {pending ? "…" : "Enregistrer"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="text-rose-600"
            disabled={pending}
            onClick={() => run({ method: "DELETE", path }, "Supprimé.")}
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
