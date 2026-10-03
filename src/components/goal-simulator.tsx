"use client";

import { useState } from "react";
import { CalendarRange, Coins, Gauge, Timer } from "lucide-react";
import { addMonths, monthKey, monthLabelFr, monthLabelShortFr, monthsBetween, parseMonthKey } from "@/lib/date";
import { finishMonthFor, missingBy, savingNeeded, simulateSaving, type GoalSimBase } from "@/lib/goals";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MONTHLY_STEPS = [500, 1000, 1500, 2000, 3000, 5000];
const DURATIONS = [3, 6, 12, 18, 24, 36];

/**
 * "What if" previews for one goal, all counting the darets still to come:
 * - put X DH aside each month from one month to another → what it adds;
 * - gather an amount by a date → how much per month;
 * - for common monthly amounts → when the goal is reached;
 * - for common durations → how much per month.
 */
export function GoalSimulator({
  base,
  currency,
  defaultMonthly,
  deadline,
}: {
  base: GoalSimBase;
  currency: string;
  defaultMonthly: number | null;
  deadline: string | null;
}) {
  const now = parseMonthKey(base.currentMonth);
  const money = (n: number) => formatMoney(n, currency);
  const done = base.reachedNow >= base.target;

  // 1. Period saving
  const [monthly, setMonthly] = useState(toDecimalInput(defaultMonthly ?? 1000));
  const [from, setFrom] = useState(monthKey(now));
  const [to, setTo] = useState(monthKey(addMonths(now, 11)));
  const sim = from && to ? simulateSaving(base, parseDecimalInput(monthly), parseMonthKey(from), parseMonthKey(to)) : null;

  // 2. Amount by a date
  const defaultBy = deadline ?? monthKey(addMonths(now, 11));
  const [by, setBy] = useState(defaultBy);
  const [amount, setAmount] = useState(toDecimalInput(missingBy(base, parseMonthKey(defaultBy)) || null));
  const need = by ? savingNeeded(base, parseDecimalInput(amount), parseMonthKey(by)) : null;

  const monthlySteps = [...new Set([...(defaultMonthly ? [defaultMonthly] : []), ...MONTHLY_STEPS])].sort((a, b) => a - b);

  return (
    <div className="flex flex-col gap-4">
      {/* 1 */}
      <Panel icon={Coins} title="Si je mets de côté chaque mois…">
        <div className="grid grid-cols-2 gap-2">
          <Field label="DH / mois" className="col-span-2">
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={monthly}
              onChange={(e) => setMonthly(cleanDecimalInput(e.target.value))}
            />
          </Field>
          <Field label="De">
            <Input type="month" value={from} onChange={(e) => setFrom(e.target.value)} className="text-sm" />
          </Field>
          <Field label="À">
            <Input type="month" value={to} onChange={(e) => setTo(e.target.value)} className="text-sm" />
          </Field>
        </div>
        {sim ? (
          <Result
            percent={sim.percent}
            lines={[
              [`Mis de côté (${sim.months} mois)`, `+${money(sim.added)}`],
              ...(sim.fromDarets > 0 ? ([["Darets d'ici là", `+${money(sim.fromDarets)}`]] as [string, string][]) : []),
              ["Total", money(sim.total)],
            ]}
            footer={
              sim.remaining > 0
                ? `Il restera ${money(sim.remaining)} en ${monthLabelFr(parseMonthKey(to))}.`
                : `Objectif atteint en ${monthLabelFr(parseMonthKey(to))} 🎉${sim.total > base.target ? ` (+${money(sim.total - base.target)} en plus)` : ""}`
            }
          />
        ) : (
          <Hint>Indique un montant et une période valide.</Hint>
        )}
      </Panel>

      {/* 2 */}
      <Panel icon={CalendarRange} title="Je veux réunir… avant…">
        <div className="grid grid-cols-2 gap-2">
          <Field label="Montant (DH)">
            <Input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(e) => setAmount(cleanDecimalInput(e.target.value))}
            />
          </Field>
          <Field label="Avant">
            <Input
              type="month"
              value={by}
              onChange={(e) => {
                setBy(e.target.value);
                if (e.target.value) setAmount(toDecimalInput(missingBy(base, parseMonthKey(e.target.value)) || null));
              }}
              className="text-sm"
            />
          </Field>
        </div>
        {need ? (
          <Result
            percent={need.percent}
            highlight={`${money(need.monthly)} / mois`}
            lines={[
              ["Pendant", `${need.months} mois (jusqu'à ${monthLabelShortFr(parseMonthKey(by))})`],
              ...(need.fromDarets > 0 ? ([["Darets d'ici là", `+${money(need.fromDarets)}`]] as [string, string][]) : []),
              ["Objectif à ce moment", money(need.total)],
            ]}
            footer={need.remaining > 0 ? `Il restera ${money(need.remaining)}.` : "Objectif atteint 🎉"}
          />
        ) : (
          <Hint>Indique un montant et un mois à venir.</Hint>
        )}
      </Panel>

      {!done && (
        <>
          {/* 3 */}
          <Panel icon={Gauge} title="Selon ce que je mets par mois">
            <Table
              head={["Par mois", "Atteint en", "Durée"]}
              rows={monthlySteps.map((m) => {
                const end = finishMonthFor(base, m);
                return [
                  money(m),
                  end ? monthLabelShortFr(end) : "—",
                  end ? `${monthsBetween(now, end) + 1} mois` : "+50 ans",
                ];
              })}
              highlightRow={defaultMonthly ? monthlySteps.indexOf(defaultMonthly) : -1}
            />
          </Panel>

          {/* 4 */}
          <Panel icon={Timer} title="Pour finir en…">
            <Table
              head={["Durée", "Fin", "Par mois"]}
              rows={DURATIONS.map((n) => {
                const end = addMonths(now, n - 1);
                const missing = missingBy(base, end);
                return [`${n} mois`, monthLabelShortFr(end), missing > 0 ? money(Math.ceil(missing / n)) : "Darets suffisent"];
              })}
            />
          </Panel>
        </>
      )}
    </div>
  );
}

function Panel({ icon: Icon, title, children }: { icon: typeof Coins; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h3 className="flex items-center gap-2.5 text-sm font-semibold text-slate-800 dark:text-slate-100">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <Label className="text-[11px] text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-slate-400">{children}</p>;
}

function Result({
  percent,
  lines,
  footer,
  highlight,
}: {
  percent: number;
  lines: [string, string][];
  footer: string;
  highlight?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-amber-50 p-3 dark:bg-amber-950/30">
      {highlight && <p className="text-center text-xl font-bold tabular-nums text-orange-600 dark:text-amber-400">{highlight}</p>}
      {lines.map(([label, value]) => (
        <div key={label} className="flex items-center justify-between gap-2 text-sm">
          <span className="text-slate-500 dark:text-slate-400">{label}</span>
          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{value}</span>
        </div>
      ))}
      <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-amber-100 dark:bg-amber-950/60">
        <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${percent}%` }} />
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">{footer}</span>
        <span className="font-bold tabular-nums text-orange-600 dark:text-amber-400">{percent}%</span>
      </div>
    </div>
  );
}

function Table({ head, rows, highlightRow = -1 }: { head: string[]; rows: string[][]; highlightRow?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
      <div className="grid grid-cols-3 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:bg-slate-800/60">
        {head.map((h, i) => (
          <span key={h} className={cn(i > 0 && "text-right")}>
            {h}
          </span>
        ))}
      </div>
      {rows.map((row, r) => (
        <div
          key={r}
          className={cn(
            "grid grid-cols-3 border-t border-slate-100 px-3 py-2 text-sm tabular-nums dark:border-slate-800",
            r === highlightRow && "bg-amber-50 font-semibold dark:bg-amber-950/30",
          )}
        >
          {row.map((cell, i) => (
            <span key={i} className={cn(i === 0 ? "text-slate-800 dark:text-slate-100" : "text-right text-slate-600 dark:text-slate-300")}>
              {cell}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
