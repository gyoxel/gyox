"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Goal } from "@/lib/types";
import { monthLabelFr, parseMonthKey } from "@/lib/date";
import { cleanDecimalInput, cn, formatMoney, parseDecimalInput, toDecimalInput } from "@/lib/utils";
import { useRefreshData } from "@/lib/use-refresh-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface DaretOption {
  id: string;
  name: string;
  /** What the daret pays out on the user's turn. */
  payout: number;
  turnMonth: string;
  /** Name of another goal this daret already feeds, if any. */
  linkedTo: string | null;
}

const PRESETS: { emoji: string; name: string }[] = [
  { emoji: "🚗", name: "Voiture" },
  { emoji: "🏠", name: "Maison" },
  { emoji: "✈️", name: "Voyage" },
  { emoji: "🕋", name: "Omra" },
  { emoji: "💍", name: "Mariage" },
  { emoji: "📱", name: "Téléphone" },
  { emoji: "🎓", name: "Études" },
  { emoji: "🛟", name: "Épargne de secours" },
];

/** Create or edit a goal: name & emoji (with quick presets), target, money
 *  already saved, optional deadline / monthly saving, and the darets whose
 *  payout goes to it. */
export function GoalForm({ goal, darets, currency }: { goal?: Goal; darets: DaretOption[]; currency: string }) {
  const router = useRouter();
  const refreshData = useRefreshData();
  const [emoji, setEmoji] = useState(goal?.emoji ?? "🎯");
  const [name, setName] = useState(goal?.name ?? "");
  const [target, setTarget] = useState(toDecimalInput(goal?.targetAmount));
  const [saved, setSaved] = useState(toDecimalInput(goal?.savedAmount || null));
  const [monthly, setMonthly] = useState(toDecimalInput(goal?.monthlySaving));
  const [deadline, setDeadline] = useState(goal?.deadline ?? "");
  const [daretIds, setDaretIds] = useState<string[]>(goal?.daretIds ?? []);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isPending, startTransition] = useTransition();

  const targetValue = parseDecimalInput(target);
  const fromDarets = darets.filter((d) => daretIds.includes(d.id)).reduce((s, d) => s + d.payout, 0);
  const projected = parseDecimalInput(saved) + fromDarets;
  const projectedPct = targetValue > 0 ? Math.min(100, Math.round((projected / targetValue) * 100)) : 0;

  function toggleDaret(id: string) {
    setDaretIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError("Donne un nom à l'objectif.");
    if (targetValue <= 0) return setError("Indique le montant de l'objectif.");
    const payload = {
      name: name.trim(),
      emoji: emoji.trim() || "🎯",
      targetAmount: targetValue,
      savedAmount: parseDecimalInput(saved),
      monthlySaving: parseDecimalInput(monthly) > 0 ? parseDecimalInput(monthly) : null,
      deadline: deadline || null,
      daretIds,
    };
    startTransition(async () => {
      const res = await fetch(goal ? `/api/goals/${goal.id}` : "/api/goals", {
        method: goal ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError("Enregistrement impossible. Vérifie les champs.");
        return;
      }
      await refreshData();
      toast.success(goal ? "Objectif modifié." : "Objectif ajouté.");
      router.push("/goals");
    });
  }

  function remove() {
    if (!goal) return;
    startTransition(async () => {
      const res = await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Suppression impossible.");
        return;
      }
      await refreshData();
      toast.success("Objectif supprimé.");
      router.push("/goals");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      {!goal && (
        <div className="flex flex-col gap-2">
          <Label>Idées</Label>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  setEmoji(p.emoji);
                  setName(p.name);
                }}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm whitespace-nowrap",
                  name === p.name
                    ? "border-[#019c86] bg-[#019c86]/10 font-semibold text-[#007261] dark:text-teal-300"
                    : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                )}
              >
                <span className="text-base leading-none">{p.emoji}</span>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <div className="flex w-16 flex-col gap-1.5">
          <Label htmlFor="goal-emoji">Icône</Label>
          <Input id="goal-emoji" value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={8} className="text-center text-xl" />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <Label htmlFor="goal-name">Nom</Label>
          <Input id="goal-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Voiture" maxLength={60} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-target">Objectif (DH)</Label>
          <Input
            id="goal-target"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={target}
            onChange={(e) => setTarget(cleanDecimalInput(e.target.value))}
            placeholder="Ex: 80000"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-saved">Déjà épargné (DH)</Label>
          <Input
            id="goal-saved"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={saved}
            onChange={(e) => setSaved(cleanDecimalInput(e.target.value))}
            placeholder="0"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-monthly">Épargne / mois (DH)</Label>
          <Input
            id="goal-monthly"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={monthly}
            onChange={(e) => setMonthly(cleanDecimalInput(e.target.value))}
            placeholder="Optionnel"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goal-deadline">Pour quand ?</Label>
          <Input id="goal-deadline" type="month" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Darets pour cet objectif</Label>
        {darets.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-3 text-center text-sm text-slate-400 dark:border-slate-700">
            Aucune daret pour le moment.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {darets.map((d) => {
              const checked = daretIds.includes(d.id);
              return (
                <button
                  key={d.id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => toggleDaret(d.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors",
                    checked
                      ? "border-[#019c86] bg-[#019c86]/5"
                      : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2",
                      checked ? "border-[#019c86] bg-[#019c86]" : "border-slate-300 dark:border-slate-600",
                    )}
                  >
                    {checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-lg leading-none">🤝🏻</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">{d.name}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400">
                      Ton tour : {monthLabelFr(parseMonthKey(d.turnMonth))}
                      {d.linkedTo && !checked && ` · liée à « ${d.linkedTo} »`}
                    </span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                    {formatMoney(d.payout, currency)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
        <p className="text-xs text-slate-400">Une daret ne compte que pour un seul objectif.</p>
      </div>

      {targetValue > 0 && (
        <div className="rounded-xl bg-slate-50 px-3.5 py-3 text-sm dark:bg-slate-800/60">
          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-300">Épargne + darets</span>
            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
              {formatMoney(projected, currency)} · {projectedPct}%
            </span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full rounded-full bg-gradient-to-r from-[#00c3ab] to-[#007261]" style={{ width: `${projectedPct}%` }} />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Enregistrement…" : goal ? "Enregistrer" : "Ajouter l'objectif"}
      </Button>

      {goal && (
        <>
          <Button type="button" variant="outline" className="text-rose-600" onClick={() => setConfirmDelete(true)} disabled={isPending}>
            <Trash2 className="h-4 w-4" />
            Supprimer l&apos;objectif
          </Button>
          <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Supprimer cet objectif ?</DialogTitle>
                <DialogDescription>
                  « {goal.emoji} {goal.name} » sera supprimé. Tes darets ne sont pas touchées.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setConfirmDelete(false)}>
                  Annuler
                </Button>
                <Button type="button" variant="destructive" onClick={remove} disabled={isPending}>
                  Supprimer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </form>
  );
}
