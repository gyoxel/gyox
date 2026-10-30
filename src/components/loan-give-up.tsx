"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ArrowCounterClockwise, Prohibit } from "@phosphor-icons/react/ssr";
import { useT } from "@/lib/i18n/client";
import { mutate } from "@/lib/use-refresh-data";
import { formatMoney } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";

/**
 * A loan's « Je ne le récupérerai pas »: what's left won't come back — it
 * expects nothing more, and what's left stays spent (in the month it was
 * lent). Asked first; given up, the same place takes it back.
 */
export function LoanGiveUp({ loanId, name, remaining, givenUp }: { loanId: string; name: string; remaining: number; givenUp: boolean }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const path = `/api/loans/${loanId}/give-up`;

  function run(method: "POST" | "DELETE") {
    startTransition(async () => {
      const res = await mutate({ method, path });
      if (!res.ok) return void toast.error(await errorMessage(res));
      setOpen(false);
      toast.success(method === "POST" ? t("Prêt abandonné.") : t("Prêt de nouveau attendu."));
    });
  }

  const button =
    "mx-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-slate-500 active:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:active:bg-slate-800";
  if (givenUp) {
    return (
      <button type="button" onClick={() => run("DELETE")} disabled={pending} className={button}>
        <ArrowCounterClockwise weight="bold" className="h-3.5 w-3.5" />
        {t("Annuler : je l'attends encore")}
      </button>
    );
  }
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={button}>
        <Prohibit weight="bold" className="h-3.5 w-3.5" />
        {t("Je ne le récupérerai pas")}
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("Ne plus attendre ce prêt ?")}
        description={t("Les {amount} qui restent ne reviendront pas de {name} : plus rien n'est attendu. Ils restent comptés comme sortis, le mois du prêt. Tu pourras annuler.", {
          amount: formatMoney(remaining),
          name,
        })}
        confirmLabel={t("Je ne le récupérerai pas")}
        pending={pending}
        onConfirm={() => run("POST")}
      />
    </>
  );
}
