"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { PaymentMethod, SavingsMove } from "@/lib/types";
import { savingsDelete } from "@/lib/delete-specs";
import { useNavBack } from "@/lib/nav-history";
import { mutate } from "@/lib/use-refresh-data";
import { cleanDecimalInput, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { DeleteButton } from "@/components/delete-button";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DATE_FMT = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/**
 * Modifier une épargne (money put aside) or a retrait (taken back): amount,
 * note, cash / card. Its expense in Dépenses / income in Revenus follows;
 * it's deleted from here only (with it).
 */
export function SavingsEditor({ move, counted, currency }: { move: SavingsMove; counted: boolean; currency: string }) {
  const nav = useNavBack();
  const [amount, setAmount] = useState(toDecimalInput(move.amount));
  const [note, setNote] = useState(move.note ?? "");
  const [method, setMethod] = useState<PaymentMethod>(move.method);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const value = parseDecimalInput(amount);
  const isIn = move.kind === "in";

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(value > 0)) return setError("Indique un montant.");
    startTransition(async () => {
      const res = await mutate({
        method: "PATCH",
        path: `/api/savings/${move.id}`,
        body: { amount: value, method, note: note.trim() || null },
      });
      if (!res.ok) return setError(await errorMessage(res));
      toast.success("Enregistré.");
      nav.back("/epargne");
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <div className="relative flex flex-col items-center gap-1 overflow-hidden rounded-3xl bg-gradient-to-br from-lime-400 via-green-500 to-emerald-700 px-4 py-5 text-white shadow-lg shadow-green-600/20 dark:shadow-none">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" />
        <Label htmlFor="amount" className="relative text-xs text-white/80">
          {isIn ? "Mis de côté 🐷" : "Retiré de l'épargne"}
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
        <p className="relative text-[11px] text-white/80">{DATE_FMT.format(new Date(`${move.date}T12:00:00`))}</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="note">Note (optionnel)</Label>
        <Input
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={80}
          placeholder={isIn ? "Où, pourquoi : Banque CIH, vacances…" : "Pour quoi : réparation, voyage…"}
        />
      </div>

      <PaymentMethodPicker value={method} onChange={setMethod} label={isIn ? "Pris en" : "Mis en"} />

      <p className="px-1 text-[11px] text-slate-400">
        {isIn
          ? counted
            ? "Dans tes dépenses comme épargne (payée) : sorti de ton solde actuel."
            : "Pas payée dans tes dépenses : elle ne compte pas encore dans l'épargne."
          : "Dans tes revenus : revenu dans ton solde actuel."}
      </p>

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={() => nav.back("/epargne")}>
          Annuler
        </Button>
        <Button type="submit" className="flex-1 bg-lime-600 text-white hover:bg-lime-700" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>

      <DeleteButton variant="full" {...savingsDelete(move)} />
    </form>
  );
}
