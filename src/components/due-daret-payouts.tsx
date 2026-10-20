"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import type { PaymentMethod } from "@/lib/types";
import { METHOD_META } from "@/lib/payment-method";
import { mutate } from "@/lib/use-refresh-data";
import { formatMoney } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { MethodIcon } from "@/components/method-icon";
import { useT } from "@/lib/i18n/client";

export interface DueDaretPayout {
  daretId: string;
  name: string;
  icon: string;
  payout: number;
  /** "Octobre 2026": the turn's month, in the device's language. */
  monthLabel: string;
}

/** Accueil: a daret whose turn has come — the pot received? It stays here
 *  until it's confirmed (espèces or carte), like on the Daret page. */
export function DueDaretPayouts({ items, currency }: { items: DueDaretPayout[]; currency: string }) {
  const [done, setDone] = useState<string[]>([]);
  const shown = items.filter((d) => !done.includes(d.daretId));
  if (shown.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      {shown.map((d) => (
        <DaretPayoutRow key={d.daretId} item={d} currency={currency} onDone={() => setDone((ids) => [...ids, d.daretId])} />
      ))}
    </section>
  );
}

function DaretPayoutRow({ item: d, currency, onDone }: { item: DueDaretPayout; currency: string; onDone: () => void }) {
  const t = useT();
  const [choosing, setChoosing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function received(method: PaymentMethod) {
    setBusy(true);
    const res = await mutate({ method: "PATCH", path: `/api/darets/${d.daretId}`, body: { payoutMethod: method } });
    setBusy(false);
    if (!res.ok) return toast.error(await errorMessage(res));
    toast.success(t("Daret reçue ✅ {amount} ajoutés à ton solde.", { amount: formatMoney(d.payout, currency) }));
    onDone();
  }

  return (
    <div className="gx-glass flex items-center gap-2.5 rounded-[22px] border py-2 pl-2.5 pr-2">
      <Link href="/daret" className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="gx-tile flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg">{d.icon}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">
            {t("Daret")} · {d.name} · +{formatMoney(d.payout, currency)}
          </span>
          <span className="block truncate text-[11.5px] leading-snug text-emerald-700 dark:text-emerald-300">
            {t("Ton tour · {month}", { month: d.monthLabel })}
          </span>
        </span>
      </Link>
      {choosing ? (
        // How it came in: a tap on espèces or carte confirms it.
        <span className="flex shrink-0 items-center gap-1" aria-label={t("Reçue comment ?")}>
          {(["cash", "card"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => received(m)}
              disabled={busy}
              aria-label={t("Reçue en {method}", { method: t(METHOD_META[m].label) })}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm transition-transform active:scale-90 dark:border-slate-700 dark:bg-slate-800"
            >
              <MethodIcon method={m} className="h-[11px]" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => setChoosing(false)}
            disabled={busy}
            aria-label={t("Annuler")}
            className="flex h-9 w-7 items-center justify-center text-slate-400"
          >
            <X weight="bold" className="h-3.5 w-3.5" />
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setChoosing(true)}
          className="gx-cta flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-transform active:scale-95"
        >
          <Check weight="bold" className="h-4 w-4" />
          {t("Reçue ?")}
        </button>
      )}
    </div>
  );
}
