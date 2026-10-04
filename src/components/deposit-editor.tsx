"use client";

import { useState, useTransition } from "react";
import { Check, Clock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { GoalDeposit, PaymentMethod } from "@/lib/types";
import { pagesGone, useNavBack } from "@/lib/nav-history";
import { useRefreshData } from "@/lib/use-refresh-data";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/**
 * Modifier un versement: amount, name, cash / card and — for one shown in
 * Dépenses — paid or not (not paid: it stays here but doesn't count). It's
 * deleted from here only (with its expense).
 */
export function DepositEditor({
  goal,
  deposit,
  paid: initialPaid,
  currency,
}: {
  goal: { id: string; name: string; emoji: string };
  deposit: GoalDeposit;
  paid: boolean;
  currency: string;
}) {
  const nav = useNavBack();
  const refreshData = useRefreshData();
  const [amount, setAmount] = useState(toDecimalInput(deposit.amount));
  const [name, setName] = useState(deposit.name === "Versement" ? "" : deposit.name);
  const [method, setMethod] = useState<PaymentMethod>(deposit.method ?? "cash");
  const [paid, setPaid] = useState(initialPaid);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();
  const linked = deposit.expenseId != null;
  const value = parseDecimalInput(amount);

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(value > 0)) return setError("Indique un montant.");
    startTransition(async () => {
      const res = await fetch(`/api/goals/${goal.id}/deposits/${deposit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), amount: value, method, paid: linked ? paid : true }),
      });
      if (!res.ok) return setError(await errorMessage(res));
      await refreshData();
      toast.success("Versement modifié.");
      nav.back(`/goals/${goal.id}`);
    });
  }

  function remove() {
    startTransition(async () => {
      const res = await fetch(`/api/goals/${goal.id}/deposits/${deposit.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Suppression impossible.");
        return;
      }
      const gone = await pagesGone(res);
      setConfirmDelete(false);
      await refreshData();
      toast.success("Versement supprimé.");
      // Its expense went with it: don't land back on that page.
      nav.leave(gone, `/goals/${goal.id}`);
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="relative flex flex-col items-center gap-1 overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 px-4 py-5 text-white shadow-lg shadow-orange-500/20 dark:shadow-none">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <Label htmlFor="amount" className="relative text-xs text-white/80">
          Versement · {goal.emoji} {goal.name}
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
            style={{ width: `${Math.max(1, amount.length) + 0.3}ch` }}
            className="max-w-[60vw] bg-transparent text-center text-4xl font-bold text-white outline-none placeholder:text-white/40"
          />
          <span className="text-lg font-semibold text-white/70">DH</span>
        </div>
        <p className="relative text-[11px] text-white/80">{DATE_FMT.format(new Date(`${deposit.date}T12:00:00`))}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nom (optionnel)</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Prime, reste du mois…" maxLength={60} />
      </div>

      {linked ? (
        <div className="flex flex-col gap-2">
          <Label>Statut de paiement</Label>
          <div role="radiogroup" aria-label="Statut de paiement" className="grid grid-cols-2 gap-2">
            <StatusButton selected={paid} onClick={() => setPaid(true)} className="bg-emerald-500">
              <Check className="h-4 w-4" />
              Payé
            </StatusButton>
            <StatusButton selected={!paid} onClick={() => setPaid(false)} className="bg-rose-500">
              <Clock className="h-4 w-4" />
              Pas encore
            </StatusButton>
          </div>
          <div className={cn("transition-opacity", !paid && "opacity-60")}>
            <PaymentMethodPicker
              value={method}
              onChange={(m) => {
                setMethod(m);
                setPaid(true);
              }}
              label="Pris en"
            />
          </div>
          {!paid && (
            <p className="text-[11px] text-slate-400">
              Pas encore payé : il reste dans l&apos;objectif mais ne compte pas, et ne sort pas de ton solde.
            </p>
          )}
        </div>
      ) : (
        <PaymentMethodPicker value={method} onChange={setMethod} label="Pris en" />
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => nav.back(`/goals/${goal.id}`)}>
          Annuler
        </Button>
        <Button type="submit" className="flex-1 bg-orange-500 text-white hover:bg-orange-600" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>

      <Button type="button" variant="destructive" onClick={() => setConfirmDelete(true)} disabled={pending}>
        <Trash2 className="h-4 w-4" />
        Supprimer ce versement
      </Button>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer ce versement ?"
        description={
          <>
            {formatMoney(deposit.amount, currency)} sera retiré de l&apos;objectif{linked ? " et de tes dépenses" : ""}.
          </>
        }
        pending={pending}
        onConfirm={remove}
      />
    </form>
  );
}

function StatusButton({
  selected,
  onClick,
  className,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-xl border py-3 text-sm font-semibold transition-colors",
        selected
          ? cn("border-transparent text-white shadow-sm", className)
          : "border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400",
      )}
    >
      {children}
    </button>
  );
}
