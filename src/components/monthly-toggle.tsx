"use client";

import { useId } from "react";
import { Switch } from "@/components/ui/switch";
import { useT } from "@/lib/i18n/client";

/** "Chaque mois": money put aside (Épargne, a goal) every month, not once. */
export function MonthlyToggle({ checked, onChange, hint }: { checked: boolean; onChange: (on: boolean) => void; hint: string }) {
  const t = useT();
  const id = useId();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 px-3.5 py-2.5 dark:border-slate-700">
      <label htmlFor={id} className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">🔁 {t("Chaque mois")}</span>
        <span className="block text-[11px] text-slate-400">{hint}</span>
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
