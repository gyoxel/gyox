"use client";

import { useState, useTransition } from "react";
import { Bank } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { mutate } from "@/lib/use-refresh-data";
import { cleanDecimalInput, parseDecimalInput } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n/client";

/**
 * Savings held already (in a bank, at home…): added to the Épargne only —
 * not taken from the Solde, not an expense, not an income.
 */
export function ExistingSavingsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const value = parseDecimalInput(amount);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!(value > 0)) return setError(t("Indique un montant."));
    startTransition(async () => {
      const res = await mutate({
        method: "POST",
        path: "/api/savings",
        body: { kind: "existing", amount: value, method: "cash", note: note.trim() || null },
      });
      if (!res.ok) return setError(await errorMessage(res));
      toast.success(t("Ajouté à ton épargne."));
      setAmount("");
      setNote("");
      onOpenChange(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setError(null);
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("J'ai déjà une épargne")}</DialogTitle>
          <DialogDescription>
            {t("L'argent que tu avais déjà de côté. Il s'ajoute à ton épargne sans sortir de ton solde, et n'apparaît ni dans tes dépenses ni dans tes revenus.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="existing-amount">{t("Montant")}</Label>
            <Input
              id="existing-amount"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(cleanDecimalInput(e.target.value))}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="existing-note">{t("Où (optionnel)")}</Label>
            <Input
              id="existing-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={80}
              placeholder={t("Ex. Compte épargne CIH, à la maison…")}
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" className="gx-cta" disabled={pending || !(value > 0)}>
            <Bank weight="bold" className="h-4 w-4" />
            {pending ? t("Enregistrement…") : t("Ajouter à l'épargne")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
