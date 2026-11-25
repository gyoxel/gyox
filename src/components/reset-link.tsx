"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarBlank, Check, Trash, WarningCircle } from "@phosphor-icons/react";
import { mutate } from "@/lib/use-refresh-data";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { Segmented } from "@/components/ui/segmented";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * The Menu's last line: « Réinitialiser » — start again from zero, this
 * month only or everything, the categories and the people with it or not
 * (lib/reset.ts). Asked in a window; nothing goes before « Effacer ».
 */
export function ResetLink() {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [scope, setScope] = useState<"month" | "all">("month");
  const [categories, setCategories] = useState(false);
  const [people, setPeople] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function show() {
    setScope("month");
    setCategories(false);
    setPeople(false);
    setError(null);
    setOpen(true);
  }

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await mutate({ method: "POST", path: "/api/reset", body: { scope, categories, people, confirm: true } });
      if (!res.ok) return setError(await errorMessage(res));
      setOpen(false);
      toast.success(scope === "all" ? t("Tout a été effacé.") : t("Ce mois a été effacé."));
      router.push("/");
    });
  }

  return (
    <>
      <button type="button" onClick={show} className="mx-auto mt-1 px-2 py-1 text-[13px] font-medium text-rose-600 underline underline-offset-4 dark:text-rose-400">
        {t("Réinitialiser l'app")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("Réinitialiser")}</DialogTitle>
            <DialogDescription>{t("Effacer et repartir de zéro. Ça ne peut pas être annulé.")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Segmented
              label={t("Quoi effacer ?")}
              value={scope}
              onChange={setScope}
              options={[
                { key: "month", label: t("Ce mois-ci"), icon: CalendarBlank },
                { key: "all", label: t("Tout"), icon: Trash },
              ]}
            />
            <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
              {scope === "month"
                ? t("Ce qui a été ajouté ou payé ce mois-ci : dépenses, dettes, paiements, revenus, épargne, prêts, salaire reçu… Les mois d'avant restent.")
                : t("Toutes les dépenses, dettes, revenus, prêts, épargne, objectifs, darets, le salaire et l'historique. L'app revient comme au premier jour.")}
            </p>
            {scope === "all" && (
              <div className="flex flex-col gap-2">
                <Check2 checked={categories} onChange={setCategories} label={t("Les catégories aussi")} hint={t("Remises comme au début")} />
                <Check2 checked={people} onChange={setPeople} label={t("Les personnes aussi")} hint={t("La liste « De qui ? / À qui ? » vidée")} />
              </div>
            )}
            <p className="flex items-start gap-1.5 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              <WarningCircle weight="bold" className="mt-px h-4 w-4 shrink-0" />
              {t("Pour garder une copie avant, fais une sauvegarde dans Paramètres.")}
            </p>
            {error && <p className="text-sm text-rose-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t("Annuler")}
            </Button>
            <Button type="button" onClick={run} disabled={pending} className="bg-rose-600 text-white hover:bg-rose-700">
              {pending ? t("Effacement…") : scope === "all" ? t("Tout effacer") : t("Effacer ce mois")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** A line to tick: its box, what it is, a word more. */
function Check2({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-left active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
          checked ? "border-rose-600 bg-rose-600 text-white" : "border-slate-300 dark:border-slate-600",
        )}
      >
        {checked && <Check weight="bold" className="h-3.5 w-3.5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-900 dark:text-white">{label}</span>
        <span className="block text-[11.5px] text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
    </button>
  );
}
