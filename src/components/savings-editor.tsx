"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { PaymentMethod, SavingsMove } from "@/lib/types";
import type { MonthlyPlan } from "@/lib/monthly-plan";
import { parseMonthKey } from "@/lib/date";
import { savingsDelete } from "@/lib/delete-specs";
import { useNavBack } from "@/lib/nav-history";
import { mutate } from "@/lib/use-refresh-data";
import { cleanDecimalInput, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { DeleteButton } from "@/components/delete-button";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { StopMonthlyButton } from "@/components/stop-monthly-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, monthLabel } from "@/lib/i18n/dates";
import { useI18n } from "@/lib/i18n/client";

const DATE_FMT: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" };

/**
 * Modifier une épargne (money put aside) or a retrait (taken back): amount,
 * note, cash / card. Its expense in Dépenses / income in Revenus follows;
 * it's deleted from here only (with it). Put aside every month (`plan`):
 * the amount is for the months to come (each month's cash / card is
 * chosen when it's ticked), and it can be stopped.
 */
export function SavingsEditor({
  move,
  counted,
  currency,
  plan,
}: {
  move: SavingsMove;
  counted: boolean;
  currency: string;
  plan: MonthlyPlan | null;
}) {
  const nav = useNavBack();
  const { lang, t } = useI18n();
  const [amount, setAmount] = useState(toDecimalInput(move.amount));
  const [note, setNote] = useState(move.note ?? "");
  const [method, setMethod] = useState<PaymentMethod>(move.method);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const value = parseDecimalInput(amount);
  const isIn = move.kind !== "out";
  const isExisting = move.kind === "existing";
  const month = (key: string) => monthLabel(parseMonthKey(key), lang).toLowerCase();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(value > 0)) return setError(t("Indique un montant."));
    startTransition(async () => {
      const res = await mutate({
        method: "PATCH",
        path: `/api/savings/${move.id}`,
        body: { amount: value, method, note: note.trim() || null },
      });
      if (!res.ok) return setError(await errorMessage(res));
      toast.success(t("Enregistré."));
      nav.back("/epargne");
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="relative flex flex-col items-center gap-1 overflow-hidden rounded-3xl bg-gradient-to-br from-lime-400 via-green-500 to-emerald-700 px-4 py-5 text-white shadow-lg shadow-green-600/20 dark:shadow-none">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <Label htmlFor="amount" className="relative text-xs text-white/80">
          {isExisting ? `${t("Déjà épargné")} 🏦` : plan ? `${t("Mis de côté chaque mois")} 🔁` : isIn ? `${t("Mis de côté")} 🐷` : t("Retiré de l'épargne")}
        </Label>
        <div className="relative flex items-baseline gap-2">
          <span className="text-2xl font-semibold text-white/80">{isIn ? "+" : "−"}</span>
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
        <p className="relative text-[11px] text-white/80">
          {plan
            ? plan.until
              ? t("De {from} à {to}", { from: month(plan.since), to: month(plan.until) })
              : t("Depuis {month}", { month: month(plan.since) })
            : formatDate(new Date(`${move.date}T12:00:00`), lang, DATE_FMT)}
        </p>
      </div>

      {plan && (
        <p className="-mt-2 px-1 text-center text-sm text-slate-600 dark:text-slate-300">
          {t("{n} mois mis de côté : {amount}", { n: plan.paid.length, amount: formatMoney(plan.total, currency) })}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">{t("Note (optionnel)")}</Label>
        <Input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={80}
          placeholder={isIn ? t("Où, pourquoi : Banque CIH, vacances…") : t("Pour quoi : réparation, voyage…")}
        />
      </div>

      {!isExisting && !plan && <PaymentMethodPicker value={method} onChange={setMethod} label={isIn ? t("Pris en") : t("Mis en")} />}

      <p className="px-1 text-[11px] text-slate-400">
        {plan
          ? plan.running
            ? t("Revient chaque mois dans tes dépenses : coche-la quand tu la mets de côté (espèces ou carte). Un nouveau montant compte pour les mois à venir.")
            : t("Arrêtée : elle ne revient plus dans tes dépenses. Les mois mis de côté restent dans l'épargne.")
          : isExisting
          ? t("Épargne que tu avais déjà : hors de ton solde, ni dans tes dépenses ni dans tes revenus.")
          : isIn
          ? counted
            ? t("Dans tes dépenses comme épargne (payée) : sorti de ton solde actuel.")
            : t("Pas payée dans tes dépenses : elle ne compte pas encore dans l'épargne.")
          : t("Dans tes revenus : revenu dans ton solde actuel.")}
      </p>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => nav.back("/epargne")}>
          {t("Annuler")}
        </Button>
        <Button type="submit" className="flex-1 gx-cta" disabled={pending}>
          {pending ? t("Enregistrement…") : t("Enregistrer")}
        </Button>
      </div>

      {plan?.running && (
        <StopMonthlyButton
          endpoint={`/api/savings/${move.id}/stop`}
          fallback="/epargne"
          description={t("Elle ne reviendra plus dans tes dépenses. Ce qui est déjà mis de côté ({amount}) reste dans l'épargne.", {
            amount: formatMoney(plan.total, currency),
          })}
        />
      )}

      <DeleteButton variant="full" {...savingsDelete(move, t)} />
    </form>
  );
}
