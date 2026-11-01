"use client";

import Link from "next/link";
import { GearSix } from "@phosphor-icons/react/ssr";
import { useT } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

/**
 * Under a debt's or a loan's name: the people already lent to or borrowed
 * from (Personnes), to pick one. Typing narrows them down (those starting
 * with it first); the name typed in full shows no chip.
 */
export function PersonSuggestions({ people, value, onPick }: { people: string[]; value: string; onPick: (name: string) => void }) {
  const t = useT();
  const typed = fold(value);
  const shown = typed
    ? people
        .filter((p) => fold(p).includes(typed) && fold(p) !== typed)
        .sort((a, b) => Number(!fold(b).startsWith(typed)) - Number(!fold(a).startsWith(typed)))
    : people;
  if (people.length > 0 && shown.length === 0) return null;
  return (
    <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-0.5 [scrollbar-width:none]" aria-label={t("Personnes")}>
      {shown.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => onPick(name)}
          className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 active:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
        >
          {name}
        </button>
      ))}
      {!typed && (
        <Link
          href="/personnes"
          className={cn(
            "flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium text-violet-700 active:bg-violet-50 dark:text-violet-300 dark:active:bg-violet-950/40",
            people.length === 0 && "px-1",
          )}
        >
          <GearSix weight="bold" className="h-3.5 w-3.5" />
          {people.length === 0 ? t("Gérer les personnes") : t("Gérer")}
        </Link>
      )}
    </div>
  );
}
