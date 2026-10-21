"use client";

import { useMemo, useState, useTransition } from "react";
import { CaretLeft, CaretRight, Minus, Plus } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { useNavBack } from "@/lib/nav-history";
import { mutate } from "@/lib/use-refresh-data";
import { addMonths, monthKey, parseMonthKey, todayMonth } from "@/lib/date";
import { monthLabel, monthLabelShort } from "@/lib/i18n/dates";
import { useI18n } from "@/lib/i18n/client";
import type { DaretWithExpense } from "@/lib/types";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { DeleteButton } from "@/components/delete-button";
import { daretDelete } from "@/lib/delete-specs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MIN_MEMBERS = 2;
const MAX_MEMBERS = 60;

/**
 * Ajouter / modifier une daret: the monthly contribution on top (with what
 * the pot will be), the name, the number of members (− / +), the first
 * month (‹ ›) and the user's turn picked among the daret's months.
 */
export function DaretForm({
  currency,
  daret,
  history,
}: {
  currency: string;
  daret?: DaretWithExpense;
  /** Editing: what happened in it (its contributions, the pot), above Supprimer. */
  history?: React.ReactNode;
}) {
  const isEdit = daret != null;
  const nav = useNavBack();
  const { lang, t } = useI18n();
  const [name, setName] = useState(daret?.expense.name ?? "");
  const [amount, setAmount] = useState(toDecimalInput(daret?.expense.amount ?? null));
  const [members, setMembers] = useState(daret?.members ?? 10);
  const [startMonth, setStartMonth] = useState(() => daret?.expense.startDate.slice(0, 7) ?? monthKey(todayMonth()));
  const [turnMonth, setTurnMonth] = useState(() => daret?.turnMonth ?? monthKey(todayMonth()));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const money = (n: number) => formatMoney(n, currency);

  const start = parseMonthKey(startMonth);
  const months = useMemo(
    () => Array.from({ length: members }, (_, i) => addMonths(parseMonthKey(startMonth), i)),
    [startMonth, members],
  );
  // Keep the chosen turn within the daret when the start / members change.
  const turnIndex = Math.max(0, months.findIndex((m) => monthKey(m) === turnMonth));
  const effectiveTurn = months[turnIndex];
  const amountValue = parseDecimalInput(amount);
  const payout = amountValue > 0 ? amountValue * members : 0;
  const end = months[months.length - 1];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(amountValue > 0)) return setError(t("Indique la cotisation par mois."));
    startTransition(async () => {
      const res = await mutate({
        method: isEdit ? "PATCH" : "POST",
        path: isEdit ? `/api/darets/${daret.id}` : "/api/darets",
        body: {
          name: name.trim() || t("Daret"),
          amount: amountValue,
          members,
          startMonth,
          turnMonth: monthKey(effectiveTurn),
        },
      });
      if (!res.ok) return setError(await errorMessage(res));
      toast.success(isEdit ? t("Daret modifiée.") : t("Daret ajoutée."));
      nav.back("/daret");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Contribution and pot */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-400 via-emerald-500 to-emerald-700 px-4 pb-4 pt-5 text-white shadow-lg shadow-emerald-600/20 dark:shadow-none">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <Label htmlFor="amount" className="relative block text-center text-xs text-white/80">
          {t("Cotisation par mois")}
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
          <span className="text-lg font-semibold text-white/70">DH</span>
        </div>
        <div className="relative mt-4 flex items-center justify-between rounded-2xl bg-white/15 px-3.5 py-2.5 text-sm">
          <span className="text-white/85">
            × {t("{n} membres", { n: members })}
          </span>
          <span className="tabular-nums">
            <span className="text-xs text-white/75">{t("Tu reçois")} </span>
            <b>{payout > 0 ? `${money(payout)} 🎉` : "—"}</b>
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">{t("Nom")}</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("Ex : Daret famille")} maxLength={80} />
      </div>

      {/* Members */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <span>
          <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{t("Membres")}</span>
          <span className="block text-[11px] text-slate-400">{t("= nombre de mois")}</span>
        </span>
        <div className="flex items-center gap-2">
          <StepButton label={t("Un membre de moins")} onClick={() => setMembers((n) => Math.max(MIN_MEMBERS, n - 1))} disabled={members <= MIN_MEMBERS}>
            <Minus weight="bold" className="h-4 w-4" />
          </StepButton>
          <span className="w-8 text-center text-lg font-bold tabular-nums text-slate-900 dark:text-white">{members}</span>
          <StepButton label={t("Un membre de plus")} onClick={() => setMembers((n) => Math.min(MAX_MEMBERS, n + 1))} disabled={members >= MAX_MEMBERS}>
            <Plus weight="bold" className="h-4 w-4" />
          </StepButton>
        </div>
      </div>

      {/* First month */}
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{t("Premier mois")}</span>
        <div className="flex items-center gap-1">
          <StepButton label={t("Mois précédent")} onClick={() => setStartMonth(monthKey(addMonths(start, -1)))}>
            <CaretLeft weight="bold" className="h-4 w-4" />
          </StepButton>
          <span className="w-32 text-center text-sm font-semibold capitalize text-slate-900 dark:text-white">{monthLabel(start, lang)}</span>
          <StepButton label={t("Mois suivant")} onClick={() => setStartMonth(monthKey(addMonths(start, 1)))}>
            <CaretRight weight="bold" className="h-4 w-4" />
          </StepButton>
        </div>
      </div>

      {/* Turn */}
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between px-1">
          <Label>{t("Mon tour")}</Label>
          <span className="text-[11px] text-slate-400">{t("le mois où tu reçois la daret")}</span>
        </div>
        <div role="radiogroup" aria-label={t("Mon tour")} className="grid grid-cols-4 gap-2">
          {months.map((m, i) => {
            const selected = i === turnIndex;
            return (
              <button
                key={monthKey(m)}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setTurnMonth(monthKey(m))}
                className={cn(
                  "flex flex-col items-center rounded-2xl border px-1 py-2 transition-all active:scale-[0.97]",
                  selected
                    ? "gx-cta border-transparent"
                    : "border-slate-200 bg-white text-slate-600 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                )}
              >
                <span className={cn("text-[10px] font-semibold", selected ? "text-white/80" : "text-slate-400")}>{i + 1}</span>
                <span className="text-xs font-semibold">{monthLabelShort(m, lang).replace(/ 20(\d\d)$/, " $1")}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-2xl bg-emerald-600/10 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-600/15 dark:text-teal-200">
        <p>
          {t("De {start} à {end}", { start: monthLabel(start, lang), end: monthLabel(end, lang) })} · {t("{n} mois", { n: members })}
        </p>
        {payout > 0 && (
          <p className="mt-0.5">
            {t("Tu reçois {amount} en {month} (tour {turn}/{members}).", { amount: money(payout), month: monthLabel(effectiveTurn, lang), turn: turnIndex + 1, members })}
          </p>
        )}
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => nav.back("/daret")}>
          {t("Annuler")}
        </Button>
        <Button type="submit" className="flex-1 gx-cta" disabled={isPending}>
          {isPending ? t("Enregistrement…") : isEdit ? t("Enregistrer") : t("Ajouter la daret")}
        </Button>
      </div>

      {history}

      {isEdit && <DeleteButton variant="full" {...daretDelete(daret, t)} />}
    </form>
  );
}

function StepButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition-colors active:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300 dark:active:bg-slate-800"
    >
      {children}
    </button>
  );
}

