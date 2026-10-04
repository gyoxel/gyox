"use client";

import { useState, useTransition } from "react";
import { ArrowLeftRight } from "lucide-react";
import { toast } from "sonner";
import type { PaymentMethod } from "@/lib/types";
import { mutate } from "@/lib/use-refresh-data";
import { cleanDecimalInput, cn, parseDecimalInput } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type Account = PaymentMethod | "savings";

export const ACCOUNT_META: Record<Account, { emoji: string; label: string }> = {
  cash: { emoji: "💵", label: "Cash" },
  card: { emoji: "💳", label: "Carte" },
  savings: { emoji: "🐷", label: "Épargne" },
};

const ACCOUNTS: Account[] = ["cash", "card", "savings"];
const METHODS: Account[] = ["cash", "card"];

/**
 * Moves money between cash, the card and the savings. Into the savings it
 * leaves the Solde (an expense "Épargne" in Dépenses); out of it, it comes
 * back (an income in Revenus). Cash ⇄ card is a plain transfer.
 */
export function TransferDialog({
  open,
  onOpenChange,
  balance,
  savings,
  money,
  initialFrom = "card",
  initialTo = "cash",
  mode = "any",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: Record<PaymentMethod, number>;
  savings: number;
  money: (n: number) => string;
  initialFrom?: Account;
  initialTo?: Account;
  /** From the Épargne page: "in" only asks where it's taken from, "out" only
   *  where it goes (the other side is the savings). */
  mode?: "any" | "in" | "out";
}) {
  const [from, setFrom] = useState<Account>(initialFrom);
  const [to, setTo] = useState<Account>(initialTo);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const value = parseDecimalInput(amount);
  const available = (a: Account) => (a === "savings" ? savings : balance[a]);

  function pickFrom(a: Account) {
    setFrom(a);
    if (a === to) setTo(ACCOUNTS.find((x) => x !== a)!);
  }
  function pickTo(a: Account) {
    setTo(a);
    if (a === from) setFrom(ACCOUNTS.find((x) => x !== a)!);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(value > 0)) return setError("Indique un montant.");
    if (from === to) return setError("Choisis deux comptes différents.");
    const cleanNote = note.trim() || null;
    const request =
      to === "savings"
        ? { url: "/api/savings", body: { kind: "in", amount: value, method: from, note: cleanNote } }
        : from === "savings"
          ? { url: "/api/savings", body: { kind: "out", amount: value, method: to, note: cleanNote } }
          : { url: "/api/wallet", body: { kind: "transfer", fromAccount: from, toAccount: to, amount: value, note: cleanNote } };
    startTransition(async () => {
      const res = await mutate({ method: "POST", path: request.url, body: request.body });
      if (!res.ok) return setError(await errorMessage(res));
      onOpenChange(false);
      setAmount("");
      setNote("");
      toast.success(`${money(value)} : ${ACCOUNT_META[from].label} → ${ACCOUNT_META[to].label}`);
    });
  }

  const hint =
    to === "savings"
      ? "Sort de ton solde actuel et s'ajoute à tes dépenses comme épargne."
      : from === "savings"
        ? "Revient dans ton solde actuel, comme un revenu."
        : "Retrait au guichet ou versement sur la carte.";

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) {
          setFrom(initialFrom);
          setTo(initialTo);
          setError(null);
        }
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "in" ? "Mettre de côté" : mode === "out" ? "Retirer de l'épargne" : "Transférer"}</DialogTitle>
          <DialogDescription>{hint}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {mode !== "out" && (
            <AccountRow label={mode === "in" ? "Pris de" : "De"} value={from} onPick={pickFrom} accounts={mode === "in" ? METHODS : ACCOUNTS} />
          )}
          {mode !== "in" && (
            <AccountRow label="Vers" value={to} onPick={pickTo} accounts={mode === "out" ? METHODS : ACCOUNTS} />
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-amount">Montant</Label>
            <Input
              id="transfer-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(cleanDecimalInput(e.target.value))}
            />
            <p className="text-[11px] text-slate-400">
              {ACCOUNT_META[from].label} : {money(available(from))}
              {value > 0 && <> → {money(available(from) - value)}</>}
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="transfer-note">Note (optionnel)</Label>
            <Input
              id="transfer-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={80}
              placeholder={
                to === "savings"
                  ? "Ex. Banque CIH, pour les vacances…"
                  : from === "savings"
                    ? "Ex. Réparation de la voiture"
                    : "Ex. Guichet Attijari"
              }
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="bg-indigo-600 text-white hover:bg-indigo-700" disabled={pending || !(value > 0)}>
            <ArrowLeftRight className="h-4 w-4" />
            {pending ? "Enregistrement…" : mode === "in" ? "Mettre de côté" : mode === "out" ? "Retirer" : "Transférer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccountRow({
  label,
  value,
  onPick,
  accounts,
}: {
  label: string;
  value: Account;
  onPick: (a: Account) => void;
  accounts: Account[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <div role="radiogroup" aria-label={label} className={cn("grid gap-2", accounts.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
        {accounts.map((a) => (
          <button
            key={a}
            type="button"
            role="radio"
            aria-checked={value === a}
            aria-label={`${label} ${ACCOUNT_META[a].label}`}
            onClick={() => onPick(a)}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl border px-2 py-2 text-xs font-medium transition-colors",
              value === a
                ? "border-indigo-500 bg-indigo-50 text-indigo-800 ring-1 ring-indigo-500 dark:bg-indigo-950/50 dark:text-indigo-200"
                : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300",
            )}
          >
            <span className="text-xl leading-none">{ACCOUNT_META[a].emoji}</span>
            {ACCOUNT_META[a].label}
          </button>
        ))}
      </div>
    </div>
  );
}
