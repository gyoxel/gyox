"use client";

import { ArrowCounterClockwise, Check, PencilSimple, Plus, Trash, type Icon } from "@phosphor-icons/react";
import { ACTIVITY_TITLES, type Activity, type ActivityAction } from "@/lib/activity-titles";
import { localName } from "@/lib/i18n";
import { formatDate, whenLabel } from "@/lib/i18n/dates";
import { useI18n } from "@/lib/i18n/client";
import { cn, formatMoney } from "@/lib/utils";
import { MethodLabel } from "@/components/method-icon";

const TIME_ZONE = "Africa/Casablanca";

/** How each kind of action looks: its icon and colour. */
const LOOK: Record<ActivityAction, { icon: Icon; tone: string }> = {
  add: { icon: Plus, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" },
  take: { icon: Plus, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" },
  payout: { icon: Check, tone: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400" },
  pay: { icon: Check, tone: "bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-300" },
  edit: { icon: PencilSimple, tone: "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300" },
  delete: { icon: Trash, tone: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400" },
  unpay: { icon: ArrowCounterClockwise, tone: "bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400" },
  stop: { icon: ArrowCounterClockwise, tone: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  giveup: { icon: ArrowCounterClockwise, tone: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  undo: { icon: ArrowCounterClockwise, tone: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
  skip: { icon: ArrowCounterClockwise, tone: "bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300" },
  unskip: { icon: ArrowCounterClockwise, tone: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
};

/** Historique's lines, by day: what was done, to what, when, how much. */
export function ActivityList({ activities, currency }: { activities: Activity[]; currency: string }) {
  const { lang, t } = useI18n();
  if (activities.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
        {t("Rien encore : ce que tu fais dans l'app (ajouter, modifier, supprimer, payer…) s'affichera ici.")}
      </p>
    );
  }
  const now = new Date();
  const days: { title: string; items: Activity[] }[] = [];
  for (const a of activities) {
    const title = whenLabel(a.at, lang, t, now);
    if (days.at(-1)?.title !== title) days.push({ title, items: [] });
    days.at(-1)!.items.push(a);
  }
  return (
    <div className="flex flex-col gap-3">
      {days.map((d) => (
        <section key={d.title} className="flex flex-col gap-1.5">
          <h2 className="px-1 text-xs font-medium text-slate-400">{d.title}</h2>
          <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {d.items.map((a) => {
              const look = LOOK[a.action] ?? LOOK.edit;
              const Glyph = look.icon;
              const title = ACTIVITY_TITLES[`${a.kind}:${a.action}`];
              return (
                <li key={a.id} className="flex items-center gap-3 border-t border-slate-100 px-3 py-2.5 first:border-t-0 dark:border-slate-800">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", look.tone)}>
                    <Glyph weight="bold" className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                      {title ? t(title) : a.action} · {localName(a.name, t)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] tabular-nums text-slate-400">
                      {formatDate(new Date(a.at), lang, { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" })}
                      {a.detail && (
                        <>
                          {" · "}
                          {a.detail === "cash" || a.detail === "card" ? <MethodLabel method={a.detail} /> : <span className="truncate">{a.detail}</span>}
                        </>
                      )}
                    </span>
                  </span>
                  {a.amount != null && <span className="shrink-0 text-sm font-bold tabular-nums text-slate-900 dark:text-white">{formatMoney(a.amount, currency)}</span>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
