"use client";

// The « i » beside a page's title: a sheet saying what the page is, in a
// line or two, and everything one can do on it — in the device's language.
import { useState } from "react";
import { CheckCircle, Info } from "@phosphor-icons/react/ssr";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PAGE_INFO } from "@/lib/page-info";
import { useT } from "@/lib/i18n/client";

export function PageInfoButton({ page }: { page: string }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const info = PAGE_INFO[page];
  if (!info) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("À propos de cette page")}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-violet-500 transition-transform active:scale-90 dark:text-violet-300"
      >
        <Info weight="bold" className="h-[18px] w-[18px]" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent onOpenAutoFocus={(e) => e.preventDefault()} className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="gx-tile flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[var(--gx-tile-ink)]">
                <Info weight="duotone" className="h-[18px] w-[18px]" />
              </span>
              {t(info.title)}
            </DialogTitle>
            <DialogDescription className="pt-1 text-[13.5px] leading-relaxed">{t(info.summary)}</DialogDescription>
          </DialogHeader>
          <p className="mt-1 text-[12px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {t("Ce que tu peux faire ici")}
          </p>
          <ul className="mt-2 flex flex-col gap-2.5">
            {info.points.map((point) => (
              <li key={point} className="flex gap-2.5 text-[13.5px] leading-snug text-slate-700 dark:text-slate-200">
                <CheckCircle weight="fill" className="mt-0.5 h-4 w-4 shrink-0 text-violet-500 dark:text-violet-300" />
                <span>{t(point)}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </>
  );
}
