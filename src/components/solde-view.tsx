"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowsLeftRight, CaretRight, PencilSimpleLine, Trash } from "@phosphor-icons/react/ssr";
import { toast } from "sonner";
import type { PaymentMethod } from "@/lib/types";
import type { WalletEntry, WalletSummary } from "@/lib/wallet";
import { METHOD_META } from "@/lib/payment-method";
import { mutate } from "@/lib/use-refresh-data";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { errorMessage } from "@/components/expense-editor";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { TransferDialog } from "@/components/transfer-dialog";
import { PaymentMethodPicker } from "@/components/payment-method-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MethodIcon, MethodLabel } from "@/components/method-icon";
import { localName, msg, type Lang, type T } from "@/lib/i18n";
import { formatDate, monthLabelShort } from "@/lib/i18n/dates";
import { parseMonthKey } from "@/lib/date";
import { useI18n } from "@/lib/i18n/client";

const TIME_ZONE = "Africa/Casablanca";
const DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const DAY_TITLE: Intl.DateTimeFormatOptions = { timeZone: TIME_ZONE, weekday: "long", day: "numeric", month: "long" };
const DAY_TITLE_YEAR: Intl.DateTimeFormatOptions = { timeZone: TIME_ZONE, day: "numeric", month: "long", year: "numeric" };
const TIME: Intl.DateTimeFormatOptions = { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" };

const ACCOUNTS: {
  key: PaymentMethod;
  name: string;
  tile: string;
  ring: string;
}[] = [
  {
    key: "cash",
    name: msg("Espèces"),
    tile: "bg-emerald-50 dark:bg-emerald-950/50",
    ring: "ring-emerald-500",
  },
  {
    key: "card",
    name: msg("Carte"),
    tile: "bg-violet-50 dark:bg-violet-950/50",
    ring: "ring-violet-500",
  },
];

const PAGE = 40;

function dayTitle(iso: string, todayKey: string, yesterdayKey: string, lang: Lang, t: T): string {
  const key = DAY_KEY.format(new Date(iso));
  if (key === todayKey) return t("Aujourd'hui");
  if (key === yesterdayKey) return t("Hier");
  const d = new Date(iso);
  const label = formatDate(d, lang, key.slice(0, 4) === todayKey.slice(0, 4) ? DAY_TITLE : DAY_TITLE_YEAR);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** An entry's name in the device's language (the app's own wording; a
 *  name typed by the user stays as typed). */
function entryLabel(entry: WalletEntry, lang: Lang, t: T): string {
  if (!entry.say) return localName(entry.label, t);
  const { text, vars, period } = entry.say;
  const month = period ? monthLabelShort(parseMonthKey(period), lang) : null;
  return t(text, { ...vars, ...(month ? { period: lang === "en" ? month : month.toLowerCase() } : {}) });
}

/**
 * Solde: total, cash and card (each with this month's in / out), transfer
 * between them or adjust one to its real amount, then the history of every
 * movement with its date, time and account.
 */
export function SoldeView({ wallet, currency }: { wallet: WalletSummary; currency: string }) {
  const { lang, t } = useI18n();
  const money = (n: number) => formatMoney(n, currency);
  const [filter, setFilter] = useState<PaymentMethod | "all">("all");
  const [shown, setShown] = useState(PAGE);
  const [transferOpen, setTransferOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [toDelete, setToDelete] = useState<WalletEntry | null>(null);
  const [deleting, startDelete] = useTransition();

  const monthInTotal = wallet.monthIn.cash + wallet.monthIn.card;
  const monthOutTotal = wallet.monthOut.cash + wallet.monthOut.card;

  const list = wallet.entries.filter((e) => filter === "all" || e.lines.some((l) => l.account === filter));
  const visible = list.slice(0, shown);
  const now = new Date();
  const todayKey = DAY_KEY.format(now);
  const yesterdayKey = DAY_KEY.format(new Date(now.getTime() - 86_400_000));
  const groups: { title: string; items: WalletEntry[] }[] = [];
  for (const e of visible) {
    const title = dayTitle(e.at, todayKey, yesterdayKey, lang, t);
    if (groups.at(-1)?.title !== title) groups.push({ title, items: [] });
    groups.at(-1)!.items.push(e);
  }

  function remove(entry: WalletEntry) {
    if (!entry.opId) return;
    startDelete(async () => {
      const res = await mutate({ method: "DELETE", path: `/api/wallet/${entry.opId}` });
      if (!res.ok) {
        toast.error(await errorMessage(res));
        return;
      }
      setToDelete(null);
      toast.success(t("Opération supprimée."));
    });
  }

  return (
    <>
      {/* Total */}
      <div className="rounded-3xl bg-gradient-to-br from-slate-800 to-slate-950 px-5 pb-4 pt-5 text-white shadow-md dark:from-slate-800 dark:to-slate-900 dark:ring-1 dark:ring-white/10">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">{t("Solde actuel")}</p>
        <p className={cn("mt-1 text-center text-4xl font-bold tabular-nums", wallet.total < 0 && "text-rose-300")}>
          {money(wallet.total)}
        </p>
        <div className="mt-4 grid grid-cols-2 divide-x divide-white/15 rounded-2xl bg-white/10 py-2.5">
          <div className="flex flex-col items-center gap-0.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-white/60">
              <ArrowDown weight="bold" className="h-3 w-3 text-emerald-300" />
              {t("Entrées du mois")}
            </span>
            <span className="text-sm font-bold tabular-nums text-emerald-300">{monthInTotal > 0 && "+"}
              {money(monthInTotal)}</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-white/60">
              <ArrowUp weight="bold" className="h-3 w-3 text-rose-300" />
              {t("Sorties du mois")}
            </span>
            <span className="text-sm font-bold tabular-nums text-rose-300">{monthOutTotal > 0 && "−"}
              {money(monthOutTotal)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2.5">
        <Button
          type="button"
          className="h-12 gx-cta"
          onClick={() => setTransferOpen(true)}
        >
          <ArrowsLeftRight weight="bold" className="h-4 w-4" />
          {t("Transférer")}
        </Button>
        <Button type="button" variant="outline" className="h-12" onClick={() => setAdjustOpen(true)}>
          <PencilSimpleLine weight="bold" className="h-4 w-4" />
          {t("Ajuster")}
        </Button>
      </div>

      {/* Accounts */}
      <section className="flex flex-col gap-2.5">
        <h2 className="px-1 text-sm font-semibold text-slate-600 dark:text-slate-300">{t("Mes comptes")}</h2>
        {ACCOUNTS.map((a) => {
          const active = filter === a.key;
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => {
                setFilter(active ? "all" : a.key);
                setShown(PAGE);
              }}
              aria-pressed={active}
              className={cn(
                "rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-left shadow-sm transition-transform active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900",
                active && `ring-2 ${a.ring}`,
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-2xl", a.tile)}>
                  <MethodIcon method={a.key} className="h-[15px]" />
                </span>
                <span className="flex-1 text-base font-semibold text-slate-900 dark:text-white">{t(a.name)}</span>
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums text-slate-900 dark:text-white",
                    wallet.balance[a.key] < 0 && "text-rose-600 dark:text-rose-400",
                  )}
                >
                  {money(wallet.balance[a.key])}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-100 pt-2.5 dark:divide-slate-800 dark:border-slate-800">
                <span className="flex flex-col items-center">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{t("Entrées")}</span>
                  <span className="flex items-center gap-0.5 text-sm font-semibold tabular-nums text-emerald-600">
                    {wallet.monthIn[a.key] > 0 && "+"}
                    {money(wallet.monthIn[a.key])}
                    <ArrowDown weight="bold" className="h-3.5 w-3.5" />
                  </span>
                </span>
                <span className="flex flex-col items-center">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{t("Sorties")}</span>
                  <span className="flex items-center gap-0.5 text-sm font-semibold tabular-nums text-rose-600">
                    {wallet.monthOut[a.key] > 0 && "−"}
                    {money(wallet.monthOut[a.key])}
                    <ArrowUp weight="bold" className="h-3.5 w-3.5" />
                  </span>
                </span>
              </div>
            </button>
          );
        })}
        <Link
          href="/epargne"
          prefetch
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-sm active:scale-[0.99] dark:border-slate-800 dark:bg-slate-900"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl gx-tile text-2xl">
            🐷
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-slate-900 dark:text-white">{t("Épargne")}</span>
            <span className="block text-[11px] text-slate-400">{t("Mise de côté, hors solde actuel")}</span>
          </span>
          <span className="text-lg font-bold tabular-nums text-lime-700 dark:text-lime-400">{money(wallet.savings)}</span>
          <CaretRight weight="bold" className="h-4 w-4 shrink-0 text-slate-300" />
        </Link>
        <p className="px-1 text-[11px] text-slate-400">
          {t("Entrées et sorties de ce mois · touche un compte pour filtrer l'historique.")}
        </p>
      </section>

      {/* History */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 px-1">
          <h2 className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t("Historique")}</h2>
          <div
            role="radiogroup"
            aria-label={t("Filtrer l'historique")}
            className="flex gap-1 rounded-full bg-slate-100 p-0.5 dark:bg-slate-800"
          >
            {(["all", "cash", "card"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={filter === f}
                onClick={() => {
                  setFilter(f);
                  setShown(PAGE);
                }}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors dark:text-slate-400",
                  filter === f && "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white",
                )}
              >
                {f === "all" ? t("Tout") : <MethodLabel method={f} />}
              </button>
            ))}
          </div>
        </div>

        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-7 text-center text-sm text-slate-400 dark:border-slate-700">
            {wallet.entries.length === 0 ? (
              t("Rien encore. Commence par « Ajuster » : indique ce que tu as en espèces et sur ta carte. Ensuite chaque salaire, revenu, daret et dépense payée s'ajoute ici.")
            ) : (
              t("Aucun mouvement sur ce compte.")
            )}
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.title} className="flex flex-col gap-1.5">
              <h3 className="px-1 text-xs font-medium text-slate-400">{g.title}</h3>
              <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {g.items.map((e) => (
                  <li key={e.id} className="border-t border-slate-100 first:border-t-0 dark:border-slate-800">
                    <EntryRow entry={e} filter={filter} money={money} onDelete={() => setToDelete(e)} />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
        {list.length > shown && (
          <Button type="button" variant="outline" onClick={() => setShown((n) => n + PAGE)}>
            {t("Voir plus")}
          </Button>
        )}
      </section>

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        balance={wallet.balance}
        savings={wallet.savings}
        money={money}
      />
      <AdjustDialog open={adjustOpen} onOpenChange={setAdjustOpen} balance={wallet.balance} money={money} />
      <ConfirmDialog
        open={toDelete != null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={toDelete?.kind === "transfer" ? t("Supprimer ce transfert ?") : t("Supprimer cet ajustement ?")}
        description={toDelete ? t("« {name} » sera supprimé et le solde recalculé.", { name: entryLabel(toDelete, lang, t) }) : null}
        pending={deleting}
        onConfirm={() => toDelete && remove(toDelete)}
      />
    </>
  );
}

function EntryRow({
  entry,
  filter,
  money,
  onDelete,
}: {
  entry: WalletEntry;
  filter: PaymentMethod | "all";
  money: (n: number) => string;
  onDelete: () => void;
}) {
  const { lang, t } = useI18n();
  const transfer = entry.kind === "transfer";
  // A transfer shows as moving money; filtered on one account, its change there.
  const line = filter === "all" ? entry.lines[entry.lines.length - 1] : entry.lines.find((l) => l.account === filter)!;
  const amount = transfer && filter === "all" ? Math.abs(line.amount) : line.amount;
  const accounts = transfer ? (
    <>
      <MethodIcon method={entry.lines[0].account} /> → <MethodIcon method={entry.lines[1].account} />
    </>
  ) : (
    <MethodLabel method={line.account} />
  );

  const body = (
    <>
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-lg",
          transfer || entry.kind === "adjust"
            ? "bg-indigo-50 dark:bg-indigo-950/50"
            : line.amount > 0
              ? "bg-emerald-50 dark:bg-emerald-950/50"
              : "bg-rose-50 dark:bg-rose-950/50",
        )}
      >
        {entry.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900 dark:text-slate-100">{entryLabel(entry, lang, t)}</span>
        <span className="block text-[11px] tabular-nums text-slate-400">
          {formatDate(new Date(entry.at), lang, TIME)} · {accounts}
        </span>
      </span>
      <span
        className={cn(
          "shrink-0 text-sm font-bold tabular-nums",
          transfer && filter === "all"
            ? "text-indigo-600 dark:text-indigo-400"
            : amount > 0
              ? "text-emerald-600"
              : "text-rose-600",
        )}
      >
        {transfer && filter === "all" ? "" : amount > 0 ? "+" : "−"}
        {money(Math.abs(amount))}
      </span>
    </>
  );

  if (entry.href) {
    return (
      <Link
        href={entry.href}
        className="flex items-center gap-3 px-3.5 py-3 active:bg-slate-50 dark:active:bg-slate-800/60"
      >
        {body}
        <CaretRight weight="bold" className="h-4 w-4 shrink-0 text-slate-300" />
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3 py-3 pl-3.5 pr-1.5">
      {body}
      <button
        type="button"
        onClick={onDelete}
        aria-label={t("Supprimer « {name} »", { name: entryLabel(entry, lang, t) })}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
      >
        <Trash weight="bold" className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Sets one account to its real amount (recorded as the difference). */
function AdjustDialog({
  open,
  onOpenChange,
  balance,
  money,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: Record<PaymentMethod, number>;
  money: (n: number) => string;
}) {
  const { t } = useI18n();
  const [account, setAccount] = useState<PaymentMethod>("cash");
  const [real, setReal] = useState(() => toDecimalInput(Math.max(0, balance.cash)));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const target = real.trim() === "" ? NaN : parseDecimalInput(real);
  const delta = Number.isFinite(target) ? Math.round((target - balance[account]) * 100) / 100 : 0;

  function pick(a: PaymentMethod) {
    setAccount(a);
    setReal(toDecimalInput(Math.max(0, balance[a])));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!Number.isFinite(target)) return setError(t("Indique le montant réel."));
    if (delta === 0) return onOpenChange(false);
    startTransition(async () => {
      const res = await mutate({
        method: "POST",
        path: "/api/wallet",
        body: { kind: "adjust", toAccount: account, amount: delta, note: null },
      });
      if (!res.ok) return setError(await errorMessage(res));
      onOpenChange(false);
      toast.success(`${t(METHOD_META[account].label)} : ${money(target)}`);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setReal(toDecimalInput(Math.max(0, balance[account])));
        onOpenChange(o);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Ajuster le solde")}</DialogTitle>
          <DialogDescription>{t("Indique ce que tu as vraiment : la différence est enregistrée.")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <PaymentMethodPicker value={account} onChange={pick} label={t("Compte")} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adjust-real">{t("Montant réel")}</Label>
            <Input
              id="adjust-real"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={real}
              onChange={(e) => setReal(cleanDecimalInput(e.target.value))}
            />
            <p className="text-[11px] text-slate-400">
              {t("Dans l'app :")} {money(balance[account])}
              {delta !== 0 && (
                <span className={delta > 0 ? "text-emerald-600" : "text-rose-600"}>
                  {" "}
                  · {delta > 0 ? "+" : "−"}
                  {money(Math.abs(delta))}
                </span>
              )}
            </p>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button type="submit" disabled={pending}>
            <PencilSimpleLine weight="bold" className="h-4 w-4" />
            {pending ? t("Enregistrement…") : t("Enregistrer")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
