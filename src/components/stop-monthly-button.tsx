"use client";

import { useState, useTransition } from "react";
import { Pause } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import { pagesGone, useNavBack } from "@/lib/nav-history";
import { mutate } from "@/lib/use-refresh-data";
import { errorMessage } from "@/components/expense-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/client";

/**
 * "Arrêter chaque mois" (Épargne, a goal's deposit): it no longer comes
 * back in Dépenses; the months put aside stay. One that never put anything
 * aside goes altogether: then back to `fallback`.
 */
export function StopMonthlyButton({
  endpoint,
  description,
  fallback,
}: {
  endpoint: string;
  description: string;
  fallback: string;
}) {
  const t = useT();
  const nav = useNavBack();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function stop() {
    startTransition(async () => {
      const res = await mutate({ method: "POST", path: endpoint });
      if (!res.ok) return void toast.error(await errorMessage(res));
      const gone = await pagesGone(res);
      setOpen(false);
      toast.success(t("Arrêté : ne revient plus chaque mois."));
      if (gone.length > 0) nav.leave(gone, fallback);
    });
  }

  return (
    <>
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(true)} disabled={pending}>
        <Pause weight="bold" className="h-4 w-4" />
        {t("Arrêter chaque mois")}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={t("Arrêter chaque mois ?")}
        description={description}
        confirmLabel={t("Arrêter")}
        pending={pending}
        onConfirm={stop}
      />
    </>
  );
}
